import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { calculateSummary, calculateWalletBalance, convertMinorByRate, isValidDateOnly, RATE_SCALE, TransactionKind } from './money';
import { migrateToV1 } from './migrations/001_initial';
import { migrateToV2 } from './migrations/002_wallets_and_transfers';
import { migrateToV3 } from './migrations/003_planning';
import { migrateToV4 } from './migrations/004_sync_queue';
import { migrateToV5 } from './migrations/005_valuation';
import { migrateToV6 } from './migrations/006_budget_alerts';
import { migrateToV7 } from './migrations/007_notification_events';
import { buildReportTimeline, calculateReportTotals } from './report-math';

export type Category = { id: string; name: string; kind: TransactionKind; icon: string; color: string };
export type Transaction = { id: string; kind: TransactionKind; amountMinor: number; currency: string; title: string; categoryId: string; categoryName: string; categoryIcon: string; categoryColor: string; walletId: string; walletName: string; occurredAt: string; note: string | null; createdAt: string; updatedAt: string };
export type WalletType = 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'credit' | 'savings' | 'other';
export type Wallet = { id: string; name: string; currency: string; type: WalletType; icon: string; color: string; openingBalanceMinor: number; balanceMinor: number; createdAt: string };
export type Transfer = { id: string; fromWalletId: string; fromWalletName: string; toWalletId: string; toWalletName: string; fromAmountMinor: number; toAmountMinor: number; fromCurrency: string; toCurrency: string; exchangeRateScaled: number; rateScale: number; feeMinor: number; occurredAt: string; note: string | null };
export type ActivityKind = 'all' | 'income' | 'expense' | 'transfer';
export type ActivitySearchFilters = { query: string; kind: ActivityKind; startDate: string; endDate: string; walletId: string; categoryId: string };
export type BudgetPeriod = 'weekly' | 'monthly';
export type Budget = { id: string; name: string; amountMinor: number; currency: string; period: BudgetPeriod; categoryId: string | null; categoryName: string | null; startsOn: string; spentMinor: number; remainingMinor: number; percentUsed: number };
export type SavingsGoal = { id: string; name: string; targetMinor: number; currency: string; targetDate: string | null; description: string | null; savedMinor: number; remainingMinor: number; percentComplete: number };
export type DebtDirection = 'owe' | 'owed_to_me';
export type Debt = { id: string; direction: DebtDirection; person: string; principalMinor: number; currency: string; openedOn: string; dueOn: string | null; interestBps: number | null; notes: string | null; paidMinor: number; remainingMinor: number };
export type DashboardData = { walletId: string; walletName: string; currency: string; balanceMinor: number; baseCurrency: string; portfolioBalanceMinor: number | null; missingValuationCurrencies: string[]; incomeMinor: number; expenseMinor: number; monthIncomeMinor: number; monthExpenseMinor: number; wallets: Wallet[]; transfers: Transfer[]; transactions: Transaction[]; categories: Category[] };
export type TransactionInput = { id?: string; kind: TransactionKind; amountMinor: number; currency?: string; title: string; categoryId: string; walletId: string; occurredAt: string; note?: string };
export type WalletInput = { id?: string; name: string; type: WalletType; currency: string; openingBalanceMinor: number };
export type TransferInput = { id?: string; fromWalletId: string; toWalletId: string; fromAmountMinor: number; toAmountMinor: number; exchangeRateScaled: number; rateScale: number; feeMinor: number; occurredAt: string; note?: string };
export type BudgetInput = { id?: string; name: string; amountMinor: number; currency: string; period: BudgetPeriod; categoryId: string | null };
export type GoalInput = { id?: string; name: string; targetMinor: number; currency: string; targetDate?: string; description?: string };
export type GoalContributionInput = { goalId: string; kind: 'add' | 'withdraw'; amountMinor: number; occurredAt: string; note?: string };
export type DebtInput = { id?: string; direction: DebtDirection; person: string; principalMinor: number; currency: string; openedOn: string; dueOn?: string; interestBps?: number; notes?: string };
export type DebtPaymentInput = { debtId: string; amountMinor: number; walletId?: string; paidOn: string; note?: string };
export type DebtPayment = { id: string; debtId: string; amountMinor: number; walletId: string | null; walletName: string | null; paidOn: string; note: string | null };
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringTransaction = { id: string; title: string; kind: TransactionKind; amountMinor: number; currency: string; categoryId: string; categoryName: string; walletId: string; walletName: string; interval: RecurrenceInterval; nextDate: string; endDate: string | null; isPaused: boolean; note: string | null };
export type BillRecurrence = 'none' | 'weekly' | 'monthly' | 'yearly';
export type BillReminder = { id: string; title: string; amountMinor: number; currency: string; dueOn: string; recurrence: BillRecurrence; walletId: string | null; walletName: string | null; note: string | null; isArchived: boolean };
export type PlanningNotificationKey = 'recurring' | 'savings' | 'debts' | 'weeklySummary';
export type PlanningNotificationPreferences = Record<PlanningNotificationKey, boolean>;
export type RecurringInput = { id?: string; title: string; kind: TransactionKind; amountMinor: number; currency: string; categoryId: string; walletId: string; interval: RecurrenceInterval; nextDate: string; endDate?: string; note?: string };
export type BillInput = { id?: string; title: string; amountMinor: number; currency: string; dueOn: string; recurrence: BillRecurrence; walletId?: string; note?: string };
export type ReportCategory = { id: string; name: string; color: string; icon: string; amountMinor: number; transactionCount: number };
export type ReportPoint = { period: string; incomeMinor: number; expenseMinor: number };
export type FinanceReport = { startDate: string; endDate: string; currency: string; accountLabel: string; incomeMinor: number; expenseMinor: number; netMinor: number; transactionCount: number; categories: ReportCategory[]; timeline: ReportPoint[]; transactions: Transaction[] };

const backupTables = [
  ['categories', 'id,name,kind,icon,color'],
  ['wallets', 'id,name,currency,opening_balance_minor,created_at,type,icon,color'],
  ['transactions', 'id,kind,amount_minor,currency,title,category_id,wallet_id,occurred_at,note,created_at,updated_at'],
  ['transfers', 'id,from_wallet_id,to_wallet_id,from_amount_minor,to_amount_minor,from_currency,to_currency,exchange_rate_scaled,rate_scale,fee_minor,occurred_at,note,created_at'],
  ['budgets', 'id,name,amount_minor,currency,period,category_id,starts_on,created_at'],
  ['savings_goals', 'id,name,target_minor,currency,target_date,description,created_at'],
  ['savings_contributions', 'id,goal_id,kind,amount_minor,occurred_at,note,created_at'],
  ['debts', 'id,direction,person,principal_minor,currency,opened_on,due_on,interest_bps,notes,created_at'],
  ['debt_payments', 'id,debt_id,amount_minor,wallet_id,paid_on,note,created_at'],
  ['recurring_transactions', 'id,title,kind,amount_minor,currency,category_id,wallet_id,interval,next_date,anchor_day,anchor_month,end_date,is_paused,note,created_at'],
  ['recurring_occurrences', 'id,recurring_id,occurrence_date,transaction_id,created_at'],
  ['bill_reminders', 'id,title,amount_minor,currency,due_on,recurrence,anchor_day,anchor_month,wallet_id,note,is_archived,created_at'],
  ['bill_payments', 'id,bill_id,due_on,paid_on,amount_minor,transaction_id,created_at'],
] as const;

export async function createLocalBackup() {
  const db = await getDatabase();
  const tables: Record<string, unknown[]> = {};
  for (const [table, columns] of backupTables) tables[table] = await db.getAllAsync(`SELECT ${columns} FROM ${table}`);
  return JSON.stringify({ format: 'hisab-local-backup', schemaVersion: 3, exportedAt: new Date().toISOString(), tables });
}

export async function restoreLocalBackup(backupText: string) {
  if (backupText.length > 100_000_000) throw new Error('This backup is too large to restore on this device.');
  let backup: { format?: string; schemaVersion?: number; tables?: Record<string, unknown> };
  try { backup = JSON.parse(backupText); } catch { throw new Error('The selected file is not valid JSON.'); }
  if (backup.format !== 'hisab-local-backup' || backup.schemaVersion !== 3 || !backup.tables || typeof backup.tables !== 'object') throw new Error('This is not a supported Hisab version 3 backup.');
  const prepared = backupTables.map(([table, columns]) => {
    const rows = backup.tables?.[table];
    if (!Array.isArray(rows) || rows.length > 250_000) throw new Error(`The backup has an invalid ${table} section.`);
    const names = columns.split(',');
    const values = rows.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${table} record ${index + 1}.`);
      const row = value as Record<string, unknown>;
      if (names.some(column => !(column in row)) || names.some(column => !['string', 'number'].includes(typeof row[column]) && row[column] !== null)) throw new Error(`Invalid fields in ${table} record ${index + 1}.`);
      if (names.some(column => typeof row[column] === 'number' && !Number.isSafeInteger(row[column]))) throw new Error(`Invalid number in ${table} record ${index + 1}.`);
      return names.map(column => row[column] as string | number | null);
    });
    return { table, columns: names, rows: values };
  });
  if (!prepared[0].rows.length || !prepared[1].rows.length) throw new Error('A backup must include at least one wallet and category.');
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const section of prepared) {
      const fields = section.columns.join(',');
      const placeholders = section.columns.map(() => '?').join(',');
      const updates = section.columns.filter(column => column !== 'id').map(column => `${column}=excluded.${column}`).join(',');
      for (const row of section.rows) await db.runAsync(`INSERT INTO ${section.table} (${fields}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`, ...row);
    }
  });
  return prepared.reduce((counts, section) => ({ ...counts, [section.table]: section.rows.length }), {} as Record<string, number>);
}

export type SyncQueueItem = { sequence: number; entity: string; recordId: string; operation: 'upsert' | 'delete'; modifiedAt: string; attempts: number };
export async function loadSyncQueue(limit = 250) {
  const db = await getDatabase();
  return db.getAllAsync<SyncQueueItem>('SELECT sequence,entity,record_id AS recordId,operation,modified_at AS modifiedAt,attempts FROM sync_queue ORDER BY sequence LIMIT ?', Math.max(1, Math.min(limit, 500)));
}

export async function loadSyncRows(entity: string, ids: string[]) {
  const section = backupTables.find(([table]) => table === entity);
  if (!section || !ids.length) throw new Error('Invalid cloud sync record request.');
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  return db.getAllAsync<Record<string, unknown>>(`SELECT ${section[1]} FROM ${section[0]} WHERE id IN (${placeholders})`, ...ids);
}

export async function applyRemoteSyncRows(entity: string, inputRows: Record<string, unknown>[]) {
  const section = backupTables.find(([table]) => table === entity);
  if (!section) throw new Error('Invalid cloud sync entity.');
  const [table, fieldText] = section; const fields = fieldText.split(',');
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const remote of inputRows) {
      if (typeof remote.id !== 'string') throw new Error(`The cloud returned an invalid ${table} record.`);
      const pending = await db.getFirstAsync<{ modifiedAt: string }>('SELECT modified_at AS modifiedAt FROM sync_queue WHERE entity=? AND record_id=?', table, remote.id);
      const remoteUpdated = typeof remote.updated_at === 'string' ? Date.parse(remote.updated_at) : Number.POSITIVE_INFINITY;
      if (pending && Number.isFinite(remoteUpdated) && Date.parse(pending.modifiedAt) > remoteUpdated) continue;
      const values = fields.map(field => {
        const value = remote[field];
        if (value === undefined) throw new Error(`The cloud is missing ${table}.${field}.`);
        if (value !== null && !['string','number','boolean'].includes(typeof value)) throw new Error(`The cloud returned invalid ${table}.${field}.`);
        if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error(`The cloud returned an unsafe ${table}.${field}.`);
        return typeof value === 'boolean' ? Number(value) : value as string | number | null;
      });
      const placeholders = fields.map(() => '?').join(',');
      const updates = fields.filter(field => field !== 'id').map(field => `${field}=excluded.${field}`).join(',');
      await db.runAsync(`INSERT INTO ${table} (${fieldText}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`, ...values);
      await db.runAsync('DELETE FROM sync_queue WHERE entity=? AND record_id=?', table, remote.id);
    }
  });
}

export async function removeSyncedLocalRow(entity: string, id: string, deletedAt?: string) {
  const section = backupTables.find(([table]) => table === entity);
  if (!section) throw new Error('Invalid cloud sync entity.');
  const db = await getDatabase();
  let removed = false;
  await db.withTransactionAsync(async () => {
    const pending = await db.getFirstAsync<{ modifiedAt: string }>('SELECT modified_at AS modifiedAt FROM sync_queue WHERE entity=? AND record_id=?', section[0], id);
    if (pending && deletedAt && Date.parse(pending.modifiedAt) > Date.parse(deletedAt)) return;
    await db.runAsync(`DELETE FROM ${section[0]} WHERE id=?`, id);
    await db.runAsync('DELETE FROM sync_queue WHERE entity=? AND record_id=?', section[0], id);
    removed = true;
  });
  return removed;
}

export async function clearSyncQueueItem(item: SyncQueueItem) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue WHERE sequence=? AND modified_at=?', item.sequence, item.modifiedAt);
}

export async function recordSyncQueueError(item: SyncQueueItem, message: string) {
  const db = await getDatabase();
  await db.runAsync('UPDATE sync_queue SET attempts=attempts+1,last_error=? WHERE sequence=? AND modified_at=?', message.slice(0, 500), item.sequence, item.modifiedAt);
}

export async function claimSyncOwner(userId: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const current = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='owner_user_id'");
    if (current && current.value !== userId) throw new Error('This local finance database is linked to a different cloud account. Restore its backup on a separate device before switching accounts.');
    await db.runAsync("INSERT INTO sync_state(key,value) VALUES ('owner_user_id',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", userId);
  });
}

export async function completeSync(lastSyncAt: string) {
  const db = await getDatabase();
  await db.runAsync("INSERT INTO sync_state(key,value) VALUES ('last_sync_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", lastSyncAt);
}

export async function getLocalSyncDeviceId(createId: () => string) {
  const db = await getDatabase();
  let deviceId = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='device_id'");
  if (!deviceId) {
    await db.runAsync("INSERT INTO sync_state(key,value) VALUES ('device_id',?) ON CONFLICT(key) DO NOTHING", createId());
    deviceId = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='device_id'");
  }
  if (!deviceId) throw new Error('Could not create this device sync ID.');
  return deviceId.value;
}

export async function loadSyncStatus() {
  const db = await getDatabase();
  const queue = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sync_queue');
  const last = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='last_sync_at'");
  return { pendingCount: Number(queue?.count ?? 0), lastSyncAt: last?.value ?? null };
}

export async function isSyncLinkedTo(userId: string) {
  const db = await getDatabase();
  const owner = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='owner_user_id'");
  return owner?.value === userId;
}

async function isPristineDefaultLedger(db: SQLite.SQLiteDatabase) {
  const wallet = await db.getFirstAsync<{ id: string; name: string; currency: string }>('SELECT id,name,currency FROM wallets ORDER BY created_at LIMIT 1');
  if (!wallet) throw new Error('Could not find the default wallet.');
  const walletCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM wallets');
  const activity = await db.getFirstAsync<{ count: number }>(`SELECT
    (SELECT COUNT(*) FROM transactions) +
    (SELECT COUNT(*) FROM transfers) +
    (SELECT COUNT(*) FROM budgets) +
    (SELECT COUNT(*) FROM savings_goals) +
    (SELECT COUNT(*) FROM debts) +
    (SELECT COUNT(*) FROM recurring_transactions) +
    (SELECT COUNT(*) FROM bill_reminders) AS count`);
  const syncOwner = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='owner_user_id'");
  return wallet.id === 'default-cash' && wallet.name === 'Cash' && wallet.currency === 'BDT' && Number(walletCount?.count ?? 0) === 1 && Number(activity?.count ?? 0) === 0 && !syncOwner;
}

export async function isInitialSetupComplete() {
  const db = await getDatabase();
  const setting = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key='initial_setup_complete'");
  if (setting?.value === 'true') return true;
  if (await isPristineDefaultLedger(db)) return false;
  await db.runAsync("INSERT INTO app_settings(key,value) VALUES ('initial_setup_complete','true') ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  return true;
}

export async function completeInitialSetup(currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) throw new Error('Choose a valid 3-letter currency code.');
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const setting = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key='initial_setup_complete'");
    if (setting?.value === 'true') return;
    if (await isPristineDefaultLedger(db)) {
      await db.runAsync('UPDATE wallets SET currency=? WHERE id=?', normalizedCurrency, 'default-cash');
      await db.runAsync("INSERT INTO valuation_settings(key,value) VALUES ('base_currency',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", normalizedCurrency);
      await db.runAsync('DELETE FROM valuation_rates');
      await db.runAsync('INSERT INTO valuation_rates(currency,rate_scaled) VALUES (?,?)', normalizedCurrency, RATE_SCALE);
    }
    await db.runAsync("INSERT INTO app_settings(key,value) VALUES ('initial_setup_complete','true') ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  });
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
async function getDatabase() {
  if (!databasePromise) databasePromise = (async () => {
    const db = await SQLite.openDatabaseAsync('hisab.db');
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const currentVersion = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let version = currentVersion?.user_version ?? 0;
    if (version > 7) throw new Error('This Hisab database is newer than this app version.');
    if (version < 1) { await db.withTransactionAsync(() => migrateToV1(db)); version = 1; }
    if (version < 2) await db.withTransactionAsync(() => migrateToV2(db));
    if (version < 3) await db.withTransactionAsync(() => migrateToV3(db));
    if (version < 4) await db.withTransactionAsync(() => migrateToV4(db));
    if (version < 5) await db.withTransactionAsync(() => migrateToV5(db));
    if (version < 6) await db.withTransactionAsync(() => migrateToV6(db));
    if (version < 7) await db.withTransactionAsync(() => migrateToV7(db));
    return db;
  })();
  return databasePromise;
}

type TransactionRow = Omit<Transaction, 'categoryName' | 'categoryIcon' | 'categoryColor' | 'walletName' | 'occurredAt' | 'createdAt' | 'updatedAt' | 'categoryId' | 'walletId'> & { categoryId: string; categoryName: string; categoryIcon: string; categoryColor: string; walletId: string; walletName: string; occurredAt: string; createdAt: string; updatedAt: string };
const transactionQuery = `SELECT t.id, t.kind, t.amount_minor AS amountMinor, t.currency, t.title, t.category_id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor, t.wallet_id AS walletId, w.name AS walletName, t.occurred_at AS occurredAt, t.note, t.created_at AS createdAt, t.updated_at AS updatedAt FROM transactions t JOIN categories c ON c.id=t.category_id JOIN wallets w ON w.id=t.wallet_id`;

type WalletRow = Omit<Wallet, 'balanceMinor'> & { incomeMinor: number; expenseMinor: number; incomingTransferMinor: number; outgoingTransferMinor: number; incomingDebtPaymentMinor: number; outgoingDebtPaymentMinor: number };
const walletQuery = `SELECT w.id, w.name, w.currency, w.type, w.icon, w.color, w.opening_balance_minor AS openingBalanceMinor, w.created_at AS createdAt,
  COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.wallet_id=w.id AND t.kind='income'),0) AS incomeMinor,
  COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.wallet_id=w.id AND t.kind='expense'),0) AS expenseMinor,
  COALESCE((SELECT SUM(tr.to_amount_minor) FROM transfers tr WHERE tr.to_wallet_id=w.id),0) AS incomingTransferMinor,
  COALESCE((SELECT SUM(tr.from_amount_minor) FROM transfers tr WHERE tr.from_wallet_id=w.id),0) AS outgoingTransferMinor,
  COALESCE((SELECT SUM(dp.amount_minor) FROM debt_payments dp JOIN debts d ON d.id=dp.debt_id WHERE dp.wallet_id=w.id AND d.direction='owed_to_me'),0) AS incomingDebtPaymentMinor,
  COALESCE((SELECT SUM(dp.amount_minor) FROM debt_payments dp JOIN debts d ON d.id=dp.debt_id WHERE dp.wallet_id=w.id AND d.direction='owe'),0) AS outgoingDebtPaymentMinor
  FROM wallets w`;
const transferQuery = `SELECT tr.id, tr.from_wallet_id AS fromWalletId, fw.name AS fromWalletName, tr.to_wallet_id AS toWalletId, tw.name AS toWalletName,
  tr.from_amount_minor AS fromAmountMinor, tr.to_amount_minor AS toAmountMinor, tr.from_currency AS fromCurrency, tr.to_currency AS toCurrency,
  tr.exchange_rate_scaled AS exchangeRateScaled, tr.rate_scale AS rateScale, tr.fee_minor AS feeMinor, tr.occurred_at AS occurredAt, tr.note
  FROM transfers tr JOIN wallets fw ON fw.id=tr.from_wallet_id JOIN wallets tw ON tw.id=tr.to_wallet_id`;

export async function loadDashboard(): Promise<DashboardData> {
  const db = await getDatabase();
  const wallet = await db.getFirstAsync<{ id: string; name: string; currency: string; openingBalanceMinor: number }>('SELECT id, name, currency, opening_balance_minor AS openingBalanceMinor FROM wallets ORDER BY created_at LIMIT 1');
  if (!wallet) throw new Error('Could not initialize the local wallet.');
  const walletRows = await db.getAllAsync<WalletRow>(`${walletQuery} ORDER BY w.created_at ASC`);
  const wallets: Wallet[] = walletRows.map(row => ({ id: row.id, name: row.name, currency: row.currency, type: row.type, icon: row.icon, color: row.color, openingBalanceMinor: row.openingBalanceMinor, createdAt: row.createdAt, balanceMinor: calculateWalletBalance(row.openingBalanceMinor, Number(row.incomeMinor), Number(row.expenseMinor), Number(row.incomingTransferMinor), Number(row.outgoingTransferMinor), Number(row.incomingDebtPaymentMinor), Number(row.outgoingDebtPaymentMinor)) }));
  const currencyWallets = wallets.filter(item => item.currency === wallet.currency);
  await db.runAsync("INSERT OR IGNORE INTO valuation_settings(key,value) VALUES ('base_currency',?)", wallet.currency);
  const baseCurrency = (await db.getFirstAsync<{ value: string }>("SELECT value FROM valuation_settings WHERE key='base_currency'"))?.value ?? wallet.currency;
  await db.runAsync('INSERT OR IGNORE INTO valuation_rates(currency,rate_scaled) VALUES (?,?)', baseCurrency, RATE_SCALE);
  const valuationRates = await db.getAllAsync<{ currency: string; rateScaled: number }>('SELECT currency,rate_scaled AS rateScaled FROM valuation_rates');
  const rateByCurrency = new Map(valuationRates.map(rate => [rate.currency, Number(rate.rateScaled)]));
  const missingValuationCurrencies = [...new Set(wallets.map(item => item.currency).filter(currency => currency !== baseCurrency && !rateByCurrency.has(currency)))];
  const portfolioBalanceMinor = missingValuationCurrencies.length ? null : wallets.reduce((total, item) => {
    if (item.currency === baseCurrency) return total + item.balanceMinor;
    const signed = item.balanceMinor < 0 ? -1 : 1;
    return total + signed * convertMinorByRate(Math.abs(item.balanceMinor), item.currency, baseCurrency, rateByCurrency.get(item.currency)!, RATE_SCALE);
  }, 0);
  if (portfolioBalanceMinor !== null && !Number.isSafeInteger(portfolioBalanceMinor)) throw new Error('Combined portfolio balance exceeds the safe integer range.');
  const transactions = await db.getAllAsync<TransactionRow>(`${transactionQuery} ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT 500`);
  const date = new Date();
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  const walletIds = currencyWallets.map(item => item.id);
  const placeholders = walletIds.map(() => '?').join(',');
  const allKinds = await db.getAllAsync<{ kind: TransactionKind; amountMinor: number }>(`SELECT kind, SUM(amount_minor) AS amountMinor FROM transactions WHERE wallet_id IN (${placeholders}) GROUP BY kind`, ...walletIds);
  const monthKinds = await db.getAllAsync<{ kind: TransactionKind; amountMinor: number }>(`SELECT kind, SUM(amount_minor) AS amountMinor FROM transactions WHERE wallet_id IN (${placeholders}) AND occurred_at>=? AND occurred_at<? GROUP BY kind`, ...walletIds, `${monthKey}-01`, `${nextMonthKey}-01`);
  const totals = calculateSummary(allKinds.map(row => ({ kind: row.kind, amountMinor: Number(row.amountMinor) })));
  const balanceMinor = currencyWallets.reduce((total, item) => total + item.balanceMinor, 0);
  if (!Number.isSafeInteger(balanceMinor)) throw new Error('Combined wallet balance exceeds the safe integer range.');
  const monthTotals = calculateSummary(monthKinds.map(row => ({ kind: row.kind, amountMinor: Number(row.amountMinor) })));
  const categories = await db.getAllAsync<Category>('SELECT id, name, kind, icon, color FROM categories ORDER BY kind, name');
  const transfers = await db.getAllAsync<Transfer>(`${transferQuery} ORDER BY tr.occurred_at DESC, tr.created_at DESC LIMIT 500`);
  return { walletId: wallet.id, walletName: wallet.name, currency: wallet.currency, balanceMinor, baseCurrency, portfolioBalanceMinor, missingValuationCurrencies, ...totals, monthIncomeMinor: monthTotals.incomeMinor, monthExpenseMinor: monthTotals.expenseMinor, wallets, transfers, transactions, categories };
}

export async function savePortfolioValuation(baseCurrency: string, rates: Record<string, number>) {
  const db = await getDatabase();
  const base = baseCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(base)) throw new Error('Enter a valid 3-letter base currency.');
  for (const [currency, rate] of Object.entries(rates)) if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(rate) || rate <= 0) throw new Error('Every exchange rate must be a positive scaled integer.');
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO valuation_settings(key,value) VALUES ('base_currency',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", base);
    await db.runAsync('DELETE FROM valuation_rates');
    await db.runAsync('INSERT INTO valuation_rates(currency,rate_scaled) VALUES (?,?) ON CONFLICT(currency) DO UPDATE SET rate_scaled=excluded.rate_scaled', base, RATE_SCALE);
    for (const [currency, rate] of Object.entries(rates)) await db.runAsync('INSERT INTO valuation_rates(currency,rate_scaled) VALUES (?,?) ON CONFLICT(currency) DO UPDATE SET rate_scaled=excluded.rate_scaled', currency, rate);
  });
}

export async function loadPortfolioValuation() {
  const db = await getDatabase();
  const base = await db.getFirstAsync<{ value: string }>("SELECT value FROM valuation_settings WHERE key='base_currency'");
  const rates = await db.getAllAsync<{ currency: string; rateScaled: number }>('SELECT currency,rate_scaled AS rateScaled FROM valuation_rates');
  const wallets = await db.getAllAsync<{ currency: string }>('SELECT DISTINCT currency FROM wallets');
  return { baseCurrency: base?.value ?? 'BDT', rates: Object.fromEntries(rates.map(rate => [rate.currency, Number(rate.rateScaled)])), currencies: wallets.map(wallet => wallet.currency) };
}

export async function saveTransaction(input: TransactionInput) {
  const db = await getDatabase();
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Enter an amount greater than zero.');
  const title = input.title.trim();
  if (!title) throw new Error('Enter a title.');
  if (!isValidDateOnly(input.occurredAt)) throw new Error('Enter a valid transaction date.');
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const category = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id=? AND kind=?', input.categoryId, input.kind);
    if (!category) throw new Error('Choose a valid category.');
    const wallet = await db.getFirstAsync<{ id: string; currency: string }>('SELECT id, currency FROM wallets WHERE id=?', input.walletId);
    if (!wallet) throw new Error('Choose a valid wallet.');
    const currency = input.currency ?? wallet.currency;
    if (currency !== wallet.currency) throw new Error('Transaction currency must match the selected wallet.');
    await db.runAsync(`INSERT INTO transactions (id,kind,amount_minor,currency,title,category_id,wallet_id,occurred_at,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, amount_minor=excluded.amount_minor, currency=excluded.currency, title=excluded.title, category_id=excluded.category_id, wallet_id=excluded.wallet_id, occurred_at=excluded.occurred_at, note=excluded.note, updated_at=excluded.updated_at`, id, input.kind, input.amountMinor, currency, title, input.categoryId, input.walletId, input.occurredAt, input.note?.trim() || null, now, now);
  });
}

const walletVisuals: Record<WalletType, { icon: string; color: string }> = { cash: { icon: 'cash-outline', color: '#16A34A' }, bank: { icon: 'business-outline', color: '#2563EB' }, bkash: { icon: 'phone-portrait-outline', color: '#D9468D' }, nagad: { icon: 'phone-portrait-outline', color: '#F97316' }, rocket: { icon: 'rocket-outline', color: '#7C3AED' }, credit: { icon: 'card-outline', color: '#EF4444' }, savings: { icon: 'lock-closed-outline', color: '#0D9488' }, other: { icon: 'wallet-outline', color: '#64748B' } };

export async function saveWallet(input: WalletInput) {
  const db = await getDatabase();
  const name = input.name.trim();
  const currency = input.currency.trim().toUpperCase();
  if (!name) throw new Error('Enter a wallet name.');
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Enter a valid 3-letter currency code.');
  if (!Number.isSafeInteger(input.openingBalanceMinor)) throw new Error('Opening balance must be a safe integer in minor units.');
  if (!['cash', 'bank', 'bkash', 'nagad', 'rocket', 'credit', 'savings', 'other'].includes(input.type)) throw new Error('Choose a valid wallet type.');
  const visual = walletVisuals[input.type] ?? walletVisuals.other;
  if (input.id) {
    const existing = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', input.id);
    if (!existing) throw new Error('Wallet not found.');
    if (existing.currency !== currency) throw new Error('Wallet currency cannot be changed after creation. Create a new wallet in the new currency instead.');
    await db.runAsync('UPDATE wallets SET name=?, type=?, icon=?, color=? WHERE id=?', name, input.type, visual.icon, visual.color, input.id);
  } else {
    await db.runAsync('INSERT INTO wallets (id,name,currency,opening_balance_minor,created_at,type,icon,color) VALUES (?,?,?,?,?,?,?,?)', randomUUID(), name, currency, input.openingBalanceMinor, new Date().toISOString(), input.type, visual.icon, visual.color);
  }
}

export async function deleteWallet(id: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM wallets');
    if ((count?.count ?? 0) <= 1) throw new Error('Keep at least one wallet in Hisab.');
    const activity = await db.getFirstAsync<{ count: number }>('SELECT (SELECT COUNT(*) FROM transactions WHERE wallet_id=?) + (SELECT COUNT(*) FROM transfers WHERE from_wallet_id=? OR to_wallet_id=?) + (SELECT COUNT(*) FROM debt_payments WHERE wallet_id=?) AS count', id, id, id, id);
    if ((activity?.count ?? 0) > 0) throw new Error('This wallet has financial history and cannot be deleted.');
    await db.runAsync('DELETE FROM wallets WHERE id=?', id);
  });
}

export async function saveTransfer(input: TransferInput) {
  const db = await getDatabase();
  if (input.fromWalletId === input.toWalletId) throw new Error('Choose two different wallets.');
  if (!Number.isSafeInteger(input.fromAmountMinor) || input.fromAmountMinor <= 0) throw new Error('Transfer amount must be greater than zero.');
  if (!Number.isSafeInteger(input.toAmountMinor) || input.toAmountMinor <= 0) throw new Error('Converted amount must be greater than zero.');
  if (!Number.isSafeInteger(input.feeMinor) || input.feeMinor < 0) throw new Error('Transfer fee cannot be negative.');
  if (!Number.isSafeInteger(input.exchangeRateScaled) || input.exchangeRateScaled <= 0 || input.rateScale !== RATE_SCALE) throw new Error('Enter a valid recorded exchange rate.');
  if (!isValidDateOnly(input.occurredAt)) throw new Error('Enter a valid transfer date.');
  const id = input.id ?? randomUUID();
  await db.withTransactionAsync(async () => {
    const fromWallet = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', input.fromWalletId);
    const toWallet = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', input.toWalletId);
    if (!fromWallet || !toWallet) throw new Error('Choose two existing wallets.');
    if (fromWallet.currency === toWallet.currency && (input.fromAmountMinor !== input.toAmountMinor || input.exchangeRateScaled !== RATE_SCALE)) throw new Error('Transfers between wallets using the same currency must preserve the amount.');
    const expectedToAmount = convertMinorByRate(input.fromAmountMinor, fromWallet.currency, toWallet.currency, input.exchangeRateScaled, input.rateScale);
    if (expectedToAmount !== input.toAmountMinor) throw new Error('Converted amount does not match the recorded exchange rate.');
    const result = await db.runAsync('INSERT OR IGNORE INTO transfers (id,from_wallet_id,to_wallet_id,from_amount_minor,to_amount_minor,from_currency,to_currency,exchange_rate_scaled,rate_scale,fee_minor,occurred_at,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', id, input.fromWalletId, input.toWalletId, input.fromAmountMinor, input.toAmountMinor, fromWallet.currency, toWallet.currency, input.exchangeRateScaled, input.rateScale, input.feeMinor, input.occurredAt, input.note?.trim() || null, new Date().toISOString());
    if (result.changes && input.feeMinor > 0) {
      const category = await db.getFirstAsync<{ id: string }>("SELECT id FROM categories WHERE kind='expense' AND name='Other expense'");
      if (!category) throw new Error('Transfer fee category is unavailable.');
      const timestamp = new Date().toISOString();
      await db.runAsync('INSERT INTO transactions (id,kind,amount_minor,currency,title,category_id,wallet_id,occurred_at,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', `${id}-fee`, 'expense', input.feeMinor, fromWallet.currency, 'Transfer fee', category.id, input.fromWalletId, input.occurredAt, input.note?.trim() || null, timestamp, timestamp);
    }
  });
}

export async function loadWallet(id: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<WalletRow>(`${walletQuery} WHERE w.id=?`, id);
  return row ? { id: row.id, name: row.name, currency: row.currency, type: row.type, icon: row.icon, color: row.color, openingBalanceMinor: row.openingBalanceMinor, createdAt: row.createdAt, balanceMinor: calculateWalletBalance(row.openingBalanceMinor, Number(row.incomeMinor), Number(row.expenseMinor), Number(row.incomingTransferMinor), Number(row.outgoingTransferMinor), Number(row.incomingDebtPaymentMinor), Number(row.outgoingDebtPaymentMinor)) } : null;
}

export async function loadTransfersForWallet(id: string) {
  const db = await getDatabase();
  return db.getAllAsync<Transfer>(`${transferQuery} WHERE tr.from_wallet_id=? OR tr.to_wallet_id=? ORDER BY tr.occurred_at DESC, tr.created_at DESC LIMIT 500`, id, id);
}

export async function loadTransactionsForWallet(id: string) {
  const db = await getDatabase();
  return db.getAllAsync<TransactionRow>(`${transactionQuery} WHERE t.wallet_id=? ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT 500`, id);
}

export async function loadTransactionPage(offset: number, limit = 50) {
  const db = await getDatabase();
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return db.getAllAsync<TransactionRow>(`${transactionQuery} ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT ? OFFSET ?`, safeLimit, safeOffset);
}

export async function loadTransferPage(offset: number, limit = 50) {
  const db = await getDatabase();
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return db.getAllAsync<Transfer>(`${transferQuery} ORDER BY tr.occurred_at DESC, tr.created_at DESC LIMIT ? OFFSET ?`, safeLimit, safeOffset);
}

function validateSearchDates(filters: ActivitySearchFilters) {
  if (filters.startDate && !isValidDateOnly(filters.startDate)) throw new Error('Enter a valid start date in YYYY-MM-DD format.');
  if (filters.endDate && !isValidDateOnly(filters.endDate)) throw new Error('Enter a valid end date in YYYY-MM-DD format.');
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new Error('Start date must not be after end date.');
}

function activitySearchText(value: string) {
  return value.trim().toLowerCase();
}

export async function searchTransactionPage(filters: ActivitySearchFilters, offset: number, limit = 50) {
  validateSearchDates(filters);
  if (filters.kind === 'transfer') return [] as Transaction[];
  const db = await getDatabase();
  const where: string[] = [];
  const params: Array<string | number> = [];
  const query = activitySearchText(filters.query);
  if (filters.kind === 'income' || filters.kind === 'expense') { where.push('t.kind=?'); params.push(filters.kind); }
  if (filters.startDate) { where.push('t.occurred_at>=?'); params.push(filters.startDate); }
  if (filters.endDate) { where.push('t.occurred_at<=?'); params.push(filters.endDate); }
  if (filters.walletId) { where.push('t.wallet_id=?'); params.push(filters.walletId); }
  if (filters.categoryId) { where.push('t.category_id=?'); params.push(filters.categoryId); }
  if (query) {
    const amountQuery = query.replace(/,/g, '');
    where.push(`(
      instr(lower(t.title),?)>0 OR instr(lower(c.name),?)>0 OR instr(lower(w.name),?)>0 OR
      instr(lower(COALESCE(t.note,'')),?)>0 OR instr(t.occurred_at,?)>0 OR
      instr(CAST(t.amount_minor AS TEXT),?)>0 OR
      instr(printf('%.*f',
        CASE WHEN t.currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 0
             WHEN t.currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 3 ELSE 2 END,
        CAST(t.amount_minor AS REAL) /
        CASE WHEN t.currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 1
             WHEN t.currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 1000 ELSE 100 END
      ),?)>0
    )`);
    params.push(query, query, query, query, query, amountQuery, amountQuery);
  }
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return db.getAllAsync<TransactionRow>(
    `${transactionQuery}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    ...params, safeLimit, safeOffset,
  );
}

export async function searchTransferPage(filters: ActivitySearchFilters, offset: number, limit = 50) {
  validateSearchDates(filters);
  if ((filters.kind !== 'all' && filters.kind !== 'transfer') || filters.categoryId) return [] as Transfer[];
  const db = await getDatabase();
  const where: string[] = [];
  const params: Array<string | number> = [];
  const query = activitySearchText(filters.query);
  if (filters.startDate) { where.push('tr.occurred_at>=?'); params.push(filters.startDate); }
  if (filters.endDate) { where.push('tr.occurred_at<=?'); params.push(filters.endDate); }
  if (filters.walletId) { where.push('(tr.from_wallet_id=? OR tr.to_wallet_id=?)'); params.push(filters.walletId, filters.walletId); }
  if (query) {
    const amountQuery = query.replace(/,/g, '');
    where.push(`(
      instr(lower(fw.name),?)>0 OR instr(lower(tw.name),?)>0 OR instr(lower(COALESCE(tr.note,'')),?)>0 OR
      instr(tr.occurred_at,?)>0 OR instr(CAST(tr.from_amount_minor AS TEXT),?)>0 OR
      instr(CAST(tr.to_amount_minor AS TEXT),?)>0 OR
      instr(printf('%.*f',
        CASE WHEN tr.from_currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 0
             WHEN tr.from_currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 3 ELSE 2 END,
        CAST(tr.from_amount_minor AS REAL) /
        CASE WHEN tr.from_currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 1
             WHEN tr.from_currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 1000 ELSE 100 END
      ),?)>0 OR
      instr(printf('%.*f',
        CASE WHEN tr.to_currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 0
             WHEN tr.to_currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 3 ELSE 2 END,
        CAST(tr.to_amount_minor AS REAL) /
        CASE WHEN tr.to_currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF') THEN 1
             WHEN tr.to_currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 1000 ELSE 100 END
      ),?)>0
    )`);
    params.push(query, query, query, query, amountQuery, amountQuery, amountQuery, amountQuery);
  }
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return db.getAllAsync<Transfer>(
    `${transferQuery}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY tr.occurred_at DESC, tr.created_at DESC LIMIT ? OFFSET ?`,
    ...params, safeLimit, safeOffset,
  );
}

export async function loadTransfer(id: string) {
  const db = await getDatabase();
  return db.getFirstAsync<Transfer>(`${transferQuery} WHERE tr.id=?`, id);
}

export async function deleteTransfer(id: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE id=?', `${id}-fee`);
    await db.runAsync('DELETE FROM transfers WHERE id=?', id);
  });
}

export async function deleteTransaction(id: string) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id=?', id);
}

export async function loadTransaction(id: string) {
  const db = await getDatabase();
  return db.getFirstAsync<TransactionRow>(`${transactionQuery} WHERE t.id=?`, id);
}

export async function loadFinanceReport(startDate: string, endDate: string, walletId?: string): Promise<FinanceReport> {
  const db = await getDatabase();
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate) || startDate > endDate) throw new Error('Choose a valid report date range.');
  const primary = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets ORDER BY created_at LIMIT 1');
  if (!primary) throw new Error('No wallet is available for this report.');
  const wallet = walletId ? await db.getFirstAsync<{ id: string; currency: string }>('SELECT id,currency FROM wallets WHERE id=?', walletId) : null;
  if (walletId && !wallet) throw new Error('Choose a valid wallet.');
  const currency = wallet?.currency ?? primary.currency;
  const wallets = wallet ? [wallet.id] : (await db.getAllAsync<{ id: string }>('SELECT id FROM wallets WHERE currency=?', currency)).map(item => item.id);
  if (!wallets.length) throw new Error('No wallets are available for this currency.');
  const where = `t.wallet_id IN (${wallets.map(() => '?').join(',')}) AND t.occurred_at>=? AND t.occurred_at<=?`;
  const params: Array<string | number> = [...wallets, startDate, endDate];
  const totals = await db.getAllAsync<{ kind: TransactionKind; amountMinor: number; transactionCount: number }>(`SELECT kind,COALESCE(SUM(amount_minor),0) AS amountMinor,COUNT(*) AS transactionCount FROM transactions t WHERE ${where} GROUP BY kind`, ...params);
  const reportTotals = calculateReportTotals(totals.map(item => ({ ...item, amountMinor: Number(item.amountMinor), transactionCount: Number(item.transactionCount) })));
  const { incomeMinor, expenseMinor } = reportTotals;
  const categories = await db.getAllAsync<ReportCategory>(`SELECT c.id,c.name,c.color,c.icon,SUM(t.amount_minor) AS amountMinor,COUNT(*) AS transactionCount FROM transactions t JOIN categories c ON c.id=t.category_id WHERE ${where} AND t.kind='expense' GROUP BY c.id,c.name,c.color,c.icon ORDER BY amountMinor DESC`, ...params);
  const start = new Date(`${startDate}T00:00:00Z`); const end = new Date(`${endDate}T00:00:00Z`);
  const monthly = (end.getTime() - start.getTime()) / 86400000 >= 62;
  const periodExpression = monthly ? "substr(t.occurred_at,1,7)" : 't.occurred_at';
  const points = await db.getAllAsync<{ period: string; kind: TransactionKind; amountMinor: number }>(`SELECT ${periodExpression} AS period,kind,SUM(amount_minor) AS amountMinor FROM transactions t WHERE ${where} GROUP BY period,kind ORDER BY period`, ...params);
  const timeline = buildReportTimeline(points.map(item => ({ ...item, amountMinor: Number(item.amountMinor) })));
  const transactionRows = await db.getAllAsync<TransactionRow>(`${transactionQuery} WHERE ${where} ORDER BY t.occurred_at DESC,t.created_at DESC`, ...params);
  return { startDate, endDate, currency, accountLabel: wallet?.id ? (await db.getFirstAsync<{ name: string }>('SELECT name FROM wallets WHERE id=?', wallet.id))?.name ?? 'Selected wallet' : `All ${currency} wallets`, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, transactionCount: reportTotals.transactionCount, categories: categories.map(item => ({ ...item, amountMinor: Number(item.amountMinor), transactionCount: Number(item.transactionCount) })), timeline, transactions: transactionRows };
}

function currentPeriod(period: BudgetPeriod) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = period === 'monthly' ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const endDate = period === 'monthly' ? new Date(today.getFullYear(), today.getMonth() + 1, 0) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const key = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { start: key(start), end: key(endDate), today: key(end) };
}

export async function loadBudgets(): Promise<Budget[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<Budget, 'spentMinor' | 'remainingMinor' | 'percentUsed'> & { categoryId: string | null; categoryName: string | null }>(`SELECT b.id,b.name,b.amount_minor AS amountMinor,b.currency,b.period,b.category_id AS categoryId,c.name AS categoryName,b.starts_on AS startsOn FROM budgets b LEFT JOIN categories c ON c.id=b.category_id ORDER BY b.created_at DESC`);
  const result: Budget[] = [];
  for (const row of rows) {
    const range = currentPeriod(row.period);
    const spent = await db.getFirstAsync<{ spentMinor: number }>('SELECT COALESCE(SUM(amount_minor),0) AS spentMinor FROM transactions WHERE kind=\'expense\' AND currency=? AND occurred_at BETWEEN ? AND ? AND (? IS NULL OR category_id=?)', row.currency, range.start, range.today, row.categoryId, row.categoryId);
    const spentMinor = Number(spent?.spentMinor ?? 0);
    result.push({ ...row, spentMinor, remainingMinor: row.amountMinor - spentMinor, percentUsed: row.amountMinor ? (spentMinor / row.amountMinor) * 100 : 0 });
  }
  return result;
}

export async function saveBudget(input: BudgetInput) {
  const db = await getDatabase();
  const name = input.name.trim();
  if (!name) throw new Error('Enter a budget name.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Budget amount must be greater than zero.');
  if (!['weekly', 'monthly'].includes(input.period)) throw new Error('Choose a valid budget period.');
  if (input.categoryId) {
    const category = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id=? AND kind=\'expense\'', input.categoryId);
    if (!category) throw new Error('Choose a valid expense category.');
  }
  const id = input.id ?? randomUUID();
  const duplicate = await db.getFirstAsync<{ id: string }>('SELECT id FROM budgets WHERE period=? AND currency=? AND category_id IS ? AND id<>? LIMIT 1', input.period, input.currency, input.categoryId, id);
  if (duplicate) throw new Error('A budget already exists for this period and category. Edit it instead.');
  const now = new Date().toISOString();
  await db.runAsync('INSERT INTO budgets (id,name,amount_minor,currency,period,category_id,starts_on,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,amount_minor=excluded.amount_minor,currency=excluded.currency,period=excluded.period,category_id=excluded.category_id', id, name, input.amountMinor, input.currency, input.period, input.categoryId, now.slice(0, 10), now);
}

export async function deleteBudget(id: string) { const db = await getDatabase(); await db.runAsync('DELETE FROM budgets WHERE id=?', id); }

export async function isBudgetAlertsEnabled() {
  const db = await getDatabase();
  return (await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key='budget_alerts_enabled'"))?.value === 'true';
}

export async function setBudgetAlertsEnabled(enabled: boolean) {
  const db = await getDatabase();
  await db.runAsync("INSERT INTO app_settings(key,value) VALUES ('budget_alerts_enabled',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", enabled ? 'true' : 'false');
}

export async function claimBudgetAlert(budgetId: string, periodKey: string, threshold: 80 | 100) {
  const db = await getDatabase();
  const result = await db.runAsync('INSERT OR IGNORE INTO budget_alert_events(budget_id,period_key,threshold,created_at) VALUES (?,?,?,?)', budgetId, periodKey, threshold, new Date().toISOString());
  return result.changes > 0;
}

export async function releaseBudgetAlert(budgetId: string, periodKey: string, threshold: 80 | 100) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM budget_alert_events WHERE budget_id=? AND period_key=? AND threshold=?', budgetId, periodKey, threshold);
}

const planningNotificationKeys: PlanningNotificationKey[] = ['recurring', 'savings', 'debts', 'weeklySummary'];

export async function loadPlanningNotificationPreferences(): Promise<PlanningNotificationPreferences> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key,value FROM app_settings WHERE key IN (${planningNotificationKeys.map(() => '?').join(',')})`,
    ...planningNotificationKeys.map(key => `notification_${key}`),
  );
  const saved = new Map(rows.map(row => [row.key, row.value]));
  return {
    recurring: saved.get('notification_recurring') === 'true',
    savings: saved.get('notification_savings') === 'true',
    debts: saved.get('notification_debts') === 'true',
    weeklySummary: saved.get('notification_weeklySummary') === 'true',
  };
}

export async function setPlanningNotificationPreference(key: PlanningNotificationKey, enabled: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO app_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    `notification_${key}`,
    enabled ? 'true' : 'false',
  );
}

export async function claimSavingsGoalAlert(goalId: string, threshold: 50 | 75 | 100) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO goal_alert_events(goal_id,threshold,created_at) VALUES (?,?,?)',
    goalId,
    threshold,
    new Date().toISOString(),
  );
  return result.changes > 0;
}

export async function releaseSavingsGoalAlert(goalId: string, threshold: 50 | 75 | 100) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM goal_alert_events WHERE goal_id=? AND threshold=?', goalId, threshold);
}

export async function loadSavingsGoals(): Promise<SavingsGoal[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<SavingsGoal, 'savedMinor' | 'remainingMinor' | 'percentComplete'>>('SELECT id,name,target_minor AS targetMinor,currency,target_date AS targetDate,description FROM savings_goals ORDER BY created_at DESC');
  return Promise.all(rows.map(async row => {
    const sum = await db.getFirstAsync<{ savedMinor: number }>("SELECT COALESCE(SUM(CASE kind WHEN 'add' THEN amount_minor ELSE -amount_minor END),0) AS savedMinor FROM savings_contributions WHERE goal_id=?", row.id);
    const savedMinor = Number(sum?.savedMinor ?? 0);
    return { ...row, savedMinor, remainingMinor: Math.max(0, row.targetMinor - savedMinor), percentComplete: Math.min(100, (savedMinor / row.targetMinor) * 100) };
  }));
}

export async function saveSavingsGoal(input: GoalInput) {
  const db = await getDatabase();
  const name = input.name.trim();
  if (!name) throw new Error('Enter a goal name.');
  if (!Number.isSafeInteger(input.targetMinor) || input.targetMinor <= 0) throw new Error('Target amount must be greater than zero.');
  if (input.targetDate && !isValidDateOnly(input.targetDate)) throw new Error('Enter a valid target date.');
  const now = new Date().toISOString();
  await db.runAsync('INSERT INTO savings_goals (id,name,target_minor,currency,target_date,description,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,target_minor=excluded.target_minor,currency=excluded.currency,target_date=excluded.target_date,description=excluded.description', input.id ?? randomUUID(), name, input.targetMinor, input.currency, input.targetDate || null, input.description?.trim() || null, now);
}

export async function recordGoalContribution(input: GoalContributionInput) {
  const db = await getDatabase();
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Contribution must be greater than zero.');
  if (!isValidDateOnly(input.occurredAt)) throw new Error('Enter a valid contribution date.');
  await db.withTransactionAsync(async () => {
    const goal = await db.getFirstAsync<{ targetMinor: number }>('SELECT target_minor AS targetMinor FROM savings_goals WHERE id=?', input.goalId);
    if (!goal) throw new Error('Savings goal not found.');
    if (input.kind === 'withdraw') {
      const saved = await db.getFirstAsync<{ amount: number }>("SELECT COALESCE(SUM(CASE kind WHEN 'add' THEN amount_minor ELSE -amount_minor END),0) AS amount FROM savings_contributions WHERE goal_id=?", input.goalId);
      if (input.amountMinor > Number(saved?.amount ?? 0)) throw new Error('Withdrawal cannot exceed the amount saved to this goal.');
    }
    await db.runAsync('INSERT INTO savings_contributions (id,goal_id,kind,amount_minor,occurred_at,note,created_at) VALUES (?,?,?,?,?,?,?)', randomUUID(), input.goalId, input.kind, input.amountMinor, input.occurredAt, input.note?.trim() || null, new Date().toISOString());
  });
}

export async function deleteSavingsGoal(id: string) { const db = await getDatabase(); await db.runAsync('DELETE FROM savings_goals WHERE id=?', id); }

export async function loadDebts(): Promise<Debt[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<Debt, 'paidMinor' | 'remainingMinor'>>('SELECT id,direction,person,principal_minor AS principalMinor,currency,opened_on AS openedOn,due_on AS dueOn,interest_bps AS interestBps,notes FROM debts ORDER BY due_on IS NULL,due_on');
  return Promise.all(rows.map(async row => {
    const total = await db.getFirstAsync<{ paidMinor: number }>('SELECT COALESCE(SUM(amount_minor),0) AS paidMinor FROM debt_payments WHERE debt_id=?', row.id);
    const paidMinor = Number(total?.paidMinor ?? 0);
    return { ...row, paidMinor, remainingMinor: row.principalMinor - paidMinor };
  }));
}

export async function saveDebt(input: DebtInput) {
  const db = await getDatabase();
  if (!input.person.trim()) throw new Error('Enter a person or organization.');
  if (!Number.isSafeInteger(input.principalMinor) || input.principalMinor <= 0) throw new Error('Debt amount must be greater than zero.');
  if (!isValidDateOnly(input.openedOn) || (input.dueOn && !isValidDateOnly(input.dueOn))) throw new Error('Enter valid debt dates.');
  if (input.interestBps !== undefined && (!Number.isSafeInteger(input.interestBps) || input.interestBps < 0)) throw new Error('Interest rate is invalid.');
  const id = input.id ?? randomUUID();
  if (input.id) {
    const existing = await db.getFirstAsync<{ direction: DebtDirection; currency: string; paidMinor: number }>('SELECT d.direction,d.currency,COALESCE(SUM(p.amount_minor),0) AS paidMinor FROM debts d LEFT JOIN debt_payments p ON p.debt_id=d.id WHERE d.id=? GROUP BY d.id', input.id);
    if (!existing) throw new Error('Debt record not found.');
    if (input.principalMinor < Number(existing.paidMinor)) throw new Error('Original amount cannot be lower than recorded payments.');
    if (Number(existing.paidMinor) > 0 && (existing.direction !== input.direction || existing.currency !== input.currency)) throw new Error('Direction and currency cannot change after payments are recorded.');
  }
  await db.runAsync('INSERT INTO debts (id,direction,person,principal_minor,currency,opened_on,due_on,interest_bps,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET direction=excluded.direction,person=excluded.person,principal_minor=excluded.principal_minor,currency=excluded.currency,opened_on=excluded.opened_on,due_on=excluded.due_on,interest_bps=excluded.interest_bps,notes=excluded.notes', id, input.direction, input.person.trim(), input.principalMinor, input.currency, input.openedOn, input.dueOn || null, input.interestBps ?? null, input.notes?.trim() || null, new Date().toISOString());
}

export async function recordDebtPayment(input: DebtPaymentInput) {
  const db = await getDatabase();
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Payment amount must be greater than zero.');
  if (!isValidDateOnly(input.paidOn)) throw new Error('Enter a valid payment date.');
  await db.withTransactionAsync(async () => {
    const debt = await db.getFirstAsync<{ principalMinor: number; currency: string }>('SELECT principal_minor AS principalMinor,currency FROM debts WHERE id=?', input.debtId);
    if (!debt) throw new Error('Debt record not found.');
    const paid = await db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(amount_minor),0) AS total FROM debt_payments WHERE debt_id=?', input.debtId);
    if (input.amountMinor > debt.principalMinor - Number(paid?.total ?? 0)) throw new Error('Payment cannot exceed the outstanding amount.');
    if (input.walletId) {
      const wallet = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', input.walletId);
      if (!wallet || wallet.currency !== debt.currency) throw new Error('Choose a wallet with the same currency as this debt.');
    }
    await db.runAsync('INSERT INTO debt_payments (id,debt_id,amount_minor,wallet_id,paid_on,note,created_at) VALUES (?,?,?,?,?,?,?)', randomUUID(), input.debtId, input.amountMinor, input.walletId ?? null, input.paidOn, input.note?.trim() || null, new Date().toISOString());
  });
}

export async function deleteDebt(id: string) { const db = await getDatabase(); await db.runAsync('DELETE FROM debts WHERE id=?', id); }

export async function loadDebtPayments(id: string) {
  const db = await getDatabase();
  return db.getAllAsync<DebtPayment>('SELECT p.id,p.debt_id AS debtId,p.amount_minor AS amountMinor,p.wallet_id AS walletId,w.name AS walletName,p.paid_on AS paidOn,p.note FROM debt_payments p LEFT JOIN wallets w ON w.id=p.wallet_id WHERE p.debt_id=? ORDER BY p.paid_on DESC,p.created_at DESC', id);
}

function dateKey(date: Date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`; }
function shiftOccurrence(value: string, interval: 'daily' | 'weekly' | 'monthly' | 'yearly', anchorDay: number, anchorMonth: number) {
  const [year, month, day] = value.split('-').map(Number);
  if (interval === 'daily' || interval === 'weekly') return dateKey(new Date(Date.UTC(year, month - 1, day + (interval === 'daily' ? 1 : 7))));
  const nextYear = interval === 'yearly' ? year + 1 : year;
  const nextMonth = interval === 'yearly' ? anchorMonth : month + 1;
  const days = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return dateKey(new Date(Date.UTC(nextYear, nextMonth - 1, Math.min(anchorDay, days))));
}
function localTodayKey() { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }

const recurringQuery = `SELECT r.id,r.title,r.kind,r.amount_minor AS amountMinor,r.currency,r.category_id AS categoryId,c.name AS categoryName,r.wallet_id AS walletId,w.name AS walletName,r.interval,r.next_date AS nextDate,r.end_date AS endDate,r.is_paused AS isPaused,r.note FROM recurring_transactions r JOIN categories c ON c.id=r.category_id JOIN wallets w ON w.id=r.wallet_id`;
export async function loadRecurringTransactions() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<RecurringTransaction, 'isPaused'> & { isPaused: number }>(`${recurringQuery} ORDER BY r.next_date ASC`);
  return rows.map(row => ({ ...row, isPaused: Boolean(row.isPaused) }));
}

export async function saveRecurringTransaction(input: RecurringInput) {
  const db = await getDatabase();
  if (!input.title.trim()) throw new Error('Enter a recurring transaction title.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Recurring amount must be greater than zero.');
  if (!isValidDateOnly(input.nextDate) || (input.endDate && !isValidDateOnly(input.endDate))) throw new Error('Enter valid recurrence dates.');
  if (input.endDate && input.endDate < input.nextDate) throw new Error('End date must be on or after the next occurrence.');
  await db.withTransactionAsync(async () => {
    const wallet = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', input.walletId);
    const category = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id=? AND kind=?', input.categoryId, input.kind);
    if (!wallet || wallet.currency !== input.currency) throw new Error('Choose a wallet with the same currency as the recurrence.');
    if (!category) throw new Error('Choose a category matching this transaction type.');
    const [year, month, day] = input.nextDate.split('-').map(Number);
    const id = input.id ?? randomUUID(); const now = new Date().toISOString();
    await db.runAsync(`INSERT INTO recurring_transactions (id,title,kind,amount_minor,currency,category_id,wallet_id,interval,next_date,anchor_day,anchor_month,end_date,is_paused,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,kind=excluded.kind,amount_minor=excluded.amount_minor,currency=excluded.currency,category_id=excluded.category_id,wallet_id=excluded.wallet_id,interval=excluded.interval,next_date=excluded.next_date,anchor_day=excluded.anchor_day,anchor_month=excluded.anchor_month,end_date=excluded.end_date,note=excluded.note`, id, input.title.trim(), input.kind, input.amountMinor, input.currency, input.categoryId, input.walletId, input.interval, input.nextDate, day, month, input.endDate || null, input.note?.trim() || null, now);
  });
}

export async function setRecurringPaused(id: string, paused: boolean) { const db = await getDatabase(); await db.runAsync('UPDATE recurring_transactions SET is_paused=? WHERE id=?', paused ? 1 : 0, id); }
export async function deleteRecurringTransaction(id: string) { const db = await getDatabase(); await db.runAsync('DELETE FROM recurring_transactions WHERE id=?', id); }

export async function postRecurringOccurrence(id: string, occurrenceDate: string) {
  const db = await getDatabase();
  if (!isValidDateOnly(occurrenceDate)) throw new Error('Invalid occurrence date.');
  let transactionId = '';
  await db.withTransactionAsync(async () => {
    const alreadyPosted = await db.getFirstAsync<{ transactionId: string }>('SELECT transaction_id AS transactionId FROM recurring_occurrences WHERE recurring_id=? AND occurrence_date=?', id, occurrenceDate);
    if (alreadyPosted) { transactionId = alreadyPosted.transactionId; return; }
    const item = await db.getFirstAsync<{ title: string; kind: TransactionKind; amountMinor: number; currency: string; categoryId: string; walletId: string; nextDate: string; endDate: string | null; interval: RecurrenceInterval; anchorDay: number; anchorMonth: number; isPaused: number; note: string | null }>('SELECT title,kind,amount_minor AS amountMinor,currency,category_id AS categoryId,wallet_id AS walletId,next_date AS nextDate,end_date AS endDate,interval,anchor_day AS anchorDay,anchor_month AS anchorMonth,is_paused AS isPaused,note FROM recurring_transactions WHERE id=?', id);
    if (!item || item.isPaused) throw new Error('This recurrence is paused or no longer available.');
    if (item.nextDate !== occurrenceDate || occurrenceDate > localTodayKey()) throw new Error('This occurrence is not due yet.');
    if (item.endDate && occurrenceDate > item.endDate) throw new Error('The recurrence has ended.');
    const now = new Date().toISOString(); transactionId = randomUUID();
    await db.runAsync('INSERT INTO transactions (id,kind,amount_minor,currency,title,category_id,wallet_id,occurred_at,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', transactionId, item.kind, item.amountMinor, item.currency, item.title, item.categoryId, item.walletId, occurrenceDate, item.note, now, now);
    await db.runAsync('INSERT INTO recurring_occurrences (id,recurring_id,occurrence_date,transaction_id,created_at) VALUES (?,?,?,?,?)', randomUUID(), id, occurrenceDate, transactionId, now);
    const nextDate = shiftOccurrence(occurrenceDate, item.interval, item.anchorDay, item.anchorMonth);
    await db.runAsync('UPDATE recurring_transactions SET next_date=?,is_paused=? WHERE id=?', nextDate, item.endDate && nextDate > item.endDate ? 1 : 0, id);
  });
  return transactionId;
}

const billQuery = `SELECT b.id,b.title,b.amount_minor AS amountMinor,b.currency,b.due_on AS dueOn,b.recurrence,b.wallet_id AS walletId,w.name AS walletName,b.note,b.is_archived AS isArchived FROM bill_reminders b LEFT JOIN wallets w ON w.id=b.wallet_id`;
export async function loadBillReminders(includeArchived = false) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<BillReminder, 'isArchived'> & { isArchived: number }>(`${billQuery} ${includeArchived ? '' : 'WHERE b.is_archived=0'} ORDER BY b.due_on ASC`);
  return rows.map(row => ({ ...row, isArchived: Boolean(row.isArchived) }));
}

export async function saveBillReminder(input: BillInput) {
  const db = await getDatabase();
  if (!input.title.trim()) throw new Error('Enter a bill title.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) throw new Error('Bill amount cannot be negative.');
  if (!isValidDateOnly(input.dueOn)) throw new Error('Enter a valid due date.');
  if (!['none', 'weekly', 'monthly', 'yearly'].includes(input.recurrence)) throw new Error('Choose a valid bill recurrence.');
  const [year, month, day] = input.dueOn.split('-').map(Number);
  const id = input.id ?? randomUUID(); const now = new Date().toISOString();
  if (input.walletId) {
    const wallet = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', input.walletId);
    if (!wallet || wallet.currency !== input.currency) throw new Error('Choose a wallet with the same currency as the bill.');
  }
  await db.runAsync(`INSERT INTO bill_reminders (id,title,amount_minor,currency,due_on,recurrence,anchor_day,anchor_month,wallet_id,note,is_archived,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,amount_minor=excluded.amount_minor,currency=excluded.currency,due_on=excluded.due_on,recurrence=excluded.recurrence,anchor_day=excluded.anchor_day,anchor_month=excluded.anchor_month,wallet_id=excluded.wallet_id,note=excluded.note,is_archived=0`, id, input.title.trim(), input.amountMinor, input.currency, input.dueOn, input.recurrence, day, month, input.walletId ?? null, input.note?.trim() || null, now);
}

export async function loadBillPayments(id: string) {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; billId: string; dueOn: string; paidOn: string; amountMinor: number; transactionId: string | null }>('SELECT id,bill_id AS billId,due_on AS dueOn,paid_on AS paidOn,amount_minor AS amountMinor,transaction_id AS transactionId FROM bill_payments WHERE bill_id=? ORDER BY paid_on DESC,created_at DESC', id);
}

export async function markBillPaid(id: string, walletId?: string | null) {
  const db = await getDatabase();
  return db.withTransactionAsync(async () => {
    const bill = await db.getFirstAsync<{ title: string; amountMinor: number; currency: string; dueOn: string; recurrence: BillRecurrence; anchorDay: number; anchorMonth: number; note: string | null }>('SELECT title,amount_minor AS amountMinor,currency,due_on AS dueOn,recurrence,anchor_day AS anchorDay,anchor_month AS anchorMonth,note FROM bill_reminders WHERE id=? AND is_archived=0', id);
    if (!bill) throw new Error('Bill reminder not found.');
    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM bill_payments WHERE bill_id=? AND due_on=?', id, bill.dueOn);
    if (existing) return;
    const chosenWalletId = walletId === undefined ? ((await db.getFirstAsync<{ walletId: string | null }>('SELECT wallet_id AS walletId FROM bill_reminders WHERE id=?', id))?.walletId ?? undefined) : (walletId || undefined);
    const paidOn = localTodayKey();
    let transactionId: string | null = null;
    if (bill.amountMinor > 0 && chosenWalletId) {
      const wallet = await db.getFirstAsync<{ currency: string }>('SELECT currency FROM wallets WHERE id=?', chosenWalletId);
      if (!wallet || wallet.currency !== bill.currency) throw new Error('Choose a wallet with the same currency as this bill.');
      const category = await db.getFirstAsync<{ id: string }>("SELECT id FROM categories WHERE kind='expense' AND name='Other expense'");
      if (!category) throw new Error('Bill expense category is unavailable.');
      transactionId = randomUUID(); const now = new Date().toISOString();
      await db.runAsync('INSERT INTO transactions (id,kind,amount_minor,currency,title,category_id,wallet_id,occurred_at,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', transactionId, 'expense', bill.amountMinor, bill.currency, bill.title, category.id, chosenWalletId, paidOn, bill.note, now, now);
    }
    await db.runAsync('INSERT INTO bill_payments (id,bill_id,due_on,paid_on,amount_minor,transaction_id,created_at) VALUES (?,?,?,?,?,?,?)', randomUUID(), id, bill.dueOn, paidOn, bill.amountMinor, transactionId, new Date().toISOString());
    if (bill.recurrence === 'none') await db.runAsync('UPDATE bill_reminders SET is_archived=1 WHERE id=?', id);
    else await db.runAsync('UPDATE bill_reminders SET due_on=? WHERE id=?', shiftOccurrence(bill.dueOn, bill.recurrence, bill.anchorDay, bill.anchorMonth), id);
  });
}

export async function deleteBillReminder(id: string) { const db = await getDatabase(); await db.runAsync('DELETE FROM bill_reminders WHERE id=?', id); }
