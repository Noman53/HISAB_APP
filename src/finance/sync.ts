import { randomUUID } from 'expo-crypto';
import { applyRemoteSyncRows, claimSyncOwner, clearSyncQueueItem, completeSync, getLocalSyncDeviceId, loadSyncQueue, loadSyncRows, recordSyncQueueError, removeSyncedLocalRow, SyncQueueItem } from './database';
import { getSupabaseClient } from '@/services/supabase';
import { resolveSyncWinner } from './sync-math';

const syncOrder = ['categories','wallets','transactions','transfers','budgets','savings_goals','debts','savings_contributions','debt_payments','recurring_transactions','bill_reminders','recurring_occurrences','bill_payments'];
const PAGE_SIZE = 500;
type CloudRecord = Record<string, unknown> & { id: string; updated_at?: string; deleted_at?: string; entity?: string; record_id?: string };

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('The cloud returned no result.');
  return data;
}
function timestamp(value: unknown) { return typeof value === 'string' ? Date.parse(value) : Number.NEGATIVE_INFINITY; }

async function cloudRows(client: NonNullable<ReturnType<typeof getSupabaseClient>>, table: string, userId: string, ids: string[]) {
  if (!ids.length) return [] as CloudRecord[];
  const result = await client.from(table).select('*').eq('user_id', userId).in('id', ids);
  return requireData(result.data as CloudRecord[] | null, result.error);
}

async function cloudTombstones(client: NonNullable<ReturnType<typeof getSupabaseClient>>, userId: string, entity: string, ids: string[]) {
  if (!ids.length) return [] as CloudRecord[];
  const result = await client.from('sync_tombstones').select('entity,record_id,deleted_at').eq('user_id', userId).eq('entity', entity).in('record_id', ids);
  return requireData(result.data as CloudRecord[] | null, result.error);
}

async function syncPendingUpserts(client: NonNullable<ReturnType<typeof getSupabaseClient>>, userId: string, entity: string, items: SyncQueueItem[]) {
  const localRows = await loadSyncRows(entity, items.map(item => item.recordId));
  const localById = new Map(localRows.map(row => [String(row.id), row]));
  const [remoteRows, tombstones] = await Promise.all([cloudRows(client, entity, userId, items.map(item => item.recordId)), cloudTombstones(client, userId, entity, items.map(item => item.recordId))]);
  const remoteById = new Map(remoteRows.map(row => [row.id, row]));
  const tombstoneById = new Map(tombstones.map(row => [String(row.record_id), row]));
  const uploads: CloudRecord[] = [];
  for (const item of items) {
    const local = localById.get(item.recordId);
    if (!local) continue;
    const remote = remoteById.get(item.recordId);
    const tombstone = tombstoneById.get(item.recordId);
    const winner = resolveSyncWinner(item.modifiedAt, remote?.updated_at, tombstone?.deleted_at);
    if (winner === 'deleted') {
      if (tombstone) await removeSyncedLocalRow(entity, item.recordId, tombstone.deleted_at ?? undefined);
      continue;
    }
    if (winner === 'remote') {
      if (remote) await applyRemoteSyncRows(entity, [remote]);
      continue;
    }
    uploads.push({ ...local, id: item.recordId, user_id: userId, updated_at: item.modifiedAt });
  }
  if (uploads.length) {
    const upsert = await client.from(entity).upsert(uploads, { onConflict: 'user_id,id' });
    if (upsert.error) throw new Error(upsert.error.message);
    const tombstoneDelete = await client.from('sync_tombstones').delete().eq('user_id', userId).eq('entity', entity).in('record_id', uploads.map(row => row.id));
    if (tombstoneDelete.error) throw new Error(tombstoneDelete.error.message);
  }
  for (const item of items) await clearSyncQueueItem(item);
}

async function syncPendingDeletes(client: NonNullable<ReturnType<typeof getSupabaseClient>>, userId: string, entity: string, items: SyncQueueItem[]) {
  const [remoteRows, tombstones] = await Promise.all([cloudRows(client, entity, userId, items.map(item => item.recordId)), cloudTombstones(client, userId, entity, items.map(item => item.recordId))]);
  const remoteById = new Map(remoteRows.map(row => [row.id, row]));
  const tombstoneById = new Map(tombstones.map(row => [String(row.record_id), row]));
  for (const item of items) {
    const remote = remoteById.get(item.recordId);
    const tombstone = tombstoneById.get(item.recordId);
    const winner = resolveSyncWinner(item.modifiedAt, remote?.updated_at, tombstone?.deleted_at);
    if (winner === 'deleted') {
      if (tombstone) await removeSyncedLocalRow(entity, item.recordId, tombstone.deleted_at ?? undefined);
      await clearSyncQueueItem(item);
      continue;
    }
    if (winner === 'remote' && remote) {
      await applyRemoteSyncRows(entity, [remote]);
      continue;
    }
    const deleted = await client.from(entity).delete().eq('user_id', userId).eq('id', item.recordId);
    if (deleted.error) throw new Error(deleted.error.message);
    const savedTombstone = await client.from('sync_tombstones').upsert({ user_id: userId, entity, record_id: item.recordId, deleted_at: item.modifiedAt }, { onConflict: 'user_id,entity,record_id' });
    if (savedTombstone.error) throw new Error(savedTombstone.error.message);
    await clearSyncQueueItem(item);
  }
}

async function pullEntity(client: NonNullable<ReturnType<typeof getSupabaseClient>>, userId: string, entity: string) {
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await client.from(entity).select('*').eq('user_id', userId).order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
    const rows = requireData(result.data as CloudRecord[] | null, result.error);
    if (rows.length) await applyRemoteSyncRows(entity, rows);
    if (rows.length < PAGE_SIZE) break;
  }
}

async function pullTombstones(client: NonNullable<ReturnType<typeof getSupabaseClient>>, userId: string) {
  const records: CloudRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await client.from('sync_tombstones').select('entity,record_id,deleted_at').eq('user_id', userId).order('entity').order('record_id').range(offset, offset + PAGE_SIZE - 1);
    const rows = requireData(result.data as CloudRecord[] | null, result.error);
    records.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  records.sort((a, b) => syncOrder.indexOf(String(b.entity)) - syncOrder.indexOf(String(a.entity)));
  for (const tombstone of records) {
    const entity = String(tombstone.entity); const id = String(tombstone.record_id);
    const [local] = await loadSyncRows(entity, [id]);
    if (!local) continue;
    const [remote] = await cloudRows(client, entity, userId, [id]);
    if (remote && timestamp(remote.updated_at) > timestamp(tombstone.deleted_at)) {
      const result = await client.from('sync_tombstones').delete().eq('user_id', userId).eq('entity', entity).eq('record_id', id);
      if (result.error) throw new Error(result.error.message);
      await applyRemoteSyncRows(entity, [remote]);
    } else await removeSyncedLocalRow(entity, id, String(tombstone.deleted_at));
  }
}

let activeSync: { userId: string; promise: Promise<string> } | null = null;

export function synchronizeFinance(userId: string): Promise<string> {
  if (activeSync) {
    return activeSync.userId === userId
      ? activeSync.promise
      : Promise.reject(new Error('A different account is already syncing on this device.'));
  }
  const promise = runFinanceSync(userId);
  activeSync = { userId, promise };
  void promise.finally(() => {
    if (activeSync?.promise === promise) activeSync = null;
  }).catch(() => undefined);
  return promise;
}

async function runFinanceSync(userId: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud sync is unavailable right now. Try again later.');
  await claimSyncOwner(userId);
  for (let round = 0; round < 100; round++) {
    const queue = await loadSyncQueue(500);
    if (!queue.length) break;
    for (const entity of syncOrder) {
      const records = queue.filter(item => item.entity === entity && item.operation === 'upsert');
      if (records.length) {
        try { await syncPendingUpserts(client, userId, entity, records); }
        catch (error) { await Promise.all(records.map(item => recordSyncQueueError(item, error instanceof Error ? error.message : 'Cloud upsert failed.'))); throw error; }
      }
    }
    for (const entity of [...syncOrder].reverse()) {
      const records = queue.filter(item => item.entity === entity && item.operation === 'delete');
      if (records.length) {
        try { await syncPendingDeletes(client, userId, entity, records); }
        catch (error) { await Promise.all(records.map(item => recordSyncQueueError(item, error instanceof Error ? error.message : 'Cloud deletion failed.'))); throw error; }
      }
    }
    if (round === 99 && (await loadSyncQueue(1)).length) throw new Error('Sync is still processing a large queue. Try again to continue.');
  }
  for (const entity of syncOrder) await pullEntity(client, userId, entity);
  await pullTombstones(client, userId);
  const lastSyncAt = new Date().toISOString();
  const device = await getLocalSyncDeviceId(randomUUID);
  const saved = await client.from('sync_metadata').upsert({ user_id: userId, device_id: device, last_synced_at: lastSyncAt, last_error: null }, { onConflict: 'user_id,device_id' });
  if (saved.error) throw new Error(saved.error.message);
  await completeSync(lastSyncAt);
  return lastSyncAt;
}

