import * as SQLite from 'expo-sqlite';

export async function migrateToV3(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE budgets (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, amount_minor INTEGER NOT NULL CHECK(amount_minor>0), currency TEXT NOT NULL, period TEXT NOT NULL CHECK(period IN ('weekly','monthly')), category_id TEXT REFERENCES categories(id), starts_on TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX budgets_period_idx ON budgets(period, starts_on);
    CREATE TABLE savings_goals (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, target_minor INTEGER NOT NULL CHECK(target_minor>0), currency TEXT NOT NULL, target_date TEXT, description TEXT, created_at TEXT NOT NULL);
    CREATE TABLE savings_contributions (id TEXT PRIMARY KEY NOT NULL, goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('add','withdraw')), amount_minor INTEGER NOT NULL CHECK(amount_minor>0), occurred_at TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL);
    CREATE INDEX savings_contributions_goal_idx ON savings_contributions(goal_id, occurred_at DESC);
    CREATE TABLE debts (id TEXT PRIMARY KEY NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('owe','owed_to_me')), person TEXT NOT NULL, principal_minor INTEGER NOT NULL CHECK(principal_minor>0), currency TEXT NOT NULL, opened_on TEXT NOT NULL, due_on TEXT, interest_bps INTEGER CHECK(interest_bps IS NULL OR interest_bps>=0), notes TEXT, created_at TEXT NOT NULL);
    CREATE TABLE debt_payments (id TEXT PRIMARY KEY NOT NULL, debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE, amount_minor INTEGER NOT NULL CHECK(amount_minor>0), wallet_id TEXT REFERENCES wallets(id), paid_on TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL);
    CREATE INDEX debt_payments_debt_idx ON debt_payments(debt_id, paid_on DESC);
    CREATE TABLE recurring_transactions (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('income','expense')), amount_minor INTEGER NOT NULL CHECK(amount_minor>0), currency TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id), wallet_id TEXT NOT NULL REFERENCES wallets(id), interval TEXT NOT NULL CHECK(interval IN ('daily','weekly','monthly','yearly')), next_date TEXT NOT NULL, anchor_day INTEGER NOT NULL DEFAULT 1, anchor_month INTEGER NOT NULL DEFAULT 1, end_date TEXT, is_paused INTEGER NOT NULL DEFAULT 0 CHECK(is_paused IN (0,1)), note TEXT, created_at TEXT NOT NULL);
    CREATE TABLE recurring_occurrences (id TEXT PRIMARY KEY NOT NULL, recurring_id TEXT NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE, occurrence_date TEXT NOT NULL, transaction_id TEXT NOT NULL REFERENCES transactions(id), created_at TEXT NOT NULL, UNIQUE(recurring_id, occurrence_date));
    CREATE TABLE bill_reminders (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), currency TEXT NOT NULL, due_on TEXT NOT NULL, recurrence TEXT NOT NULL CHECK(recurrence IN ('none','weekly','monthly','yearly')), anchor_day INTEGER NOT NULL DEFAULT 1, anchor_month INTEGER NOT NULL DEFAULT 1, wallet_id TEXT REFERENCES wallets(id), note TEXT, is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0,1)), created_at TEXT NOT NULL);
    CREATE TABLE bill_payments (id TEXT PRIMARY KEY NOT NULL, bill_id TEXT NOT NULL REFERENCES bill_reminders(id) ON DELETE CASCADE, due_on TEXT NOT NULL, paid_on TEXT NOT NULL, amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), transaction_id TEXT REFERENCES transactions(id), created_at TEXT NOT NULL);
    CREATE INDEX bill_payments_bill_idx ON bill_payments(bill_id, paid_on DESC);
    CREATE UNIQUE INDEX bill_payments_due_unique ON bill_payments(bill_id,due_on);
    PRAGMA user_version = 3;
  `);
}
