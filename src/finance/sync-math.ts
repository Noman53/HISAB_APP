export type SyncWinner = 'local' | 'remote' | 'deleted';

export function shouldAutoSync(ownerUserId: string | undefined, userId: string, setting: string | undefined, lastSyncAt: string | undefined) {
  return ownerUserId === userId && Boolean(lastSyncAt) && setting !== 'false';
}

export function resolveSyncWinner(localModifiedAt: string, remoteUpdatedAt?: string | null, remoteDeletedAt?: string | null): SyncWinner {
  const local = Date.parse(localModifiedAt);
  if (!Number.isFinite(local)) throw new Error('Local sync timestamp is invalid.');
  const remote = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : Number.NEGATIVE_INFINITY;
  const deleted = remoteDeletedAt ? Date.parse(remoteDeletedAt) : Number.NEGATIVE_INFINITY;
  if ((remoteUpdatedAt && !Number.isFinite(remote)) || (remoteDeletedAt && !Number.isFinite(deleted))) throw new Error('Cloud sync timestamp is invalid.');
  if (deleted > local && deleted >= remote) return 'deleted';
  if (remote > local) return 'remote';
  return 'local';
}
