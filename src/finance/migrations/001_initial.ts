import * as SQLite from 'expo-sqlite';

const defaultCategories = [
  ['Salary', 'income', 'briefcase-outline', '#16A34A'], ['Freelancing', 'income', 'laptop-outline', '#16A34A'], ['Business', 'income', 'storefront-outline', '#16A34A'], ['Investment', 'income', 'trending-up-outline', '#16A34A'], ['Rental income', 'income', 'home-outline', '#16A34A'], ['Bonus', 'income', 'gift-outline', '#16A34A'], ['Gift', 'income', 'gift-outline', '#16A34A'], ['Other income', 'income', 'add-circle-outline', '#16A34A'],
  ['Food & Dining', 'expense', 'restaurant-outline', '#F59E0B'], ['Transportation', 'expense', 'car-outline', '#2563EB'], ['Shopping', 'expense', 'bag-outline', '#A855F7'], ['Groceries', 'expense', 'cart-outline', '#16A34A'], ['Rent', 'expense', 'home-outline', '#EF4444'], ['Electricity', 'expense', 'flash-outline', '#EF4444'], ['Internet', 'expense', 'wifi-outline', '#EF4444'], ['Education', 'expense', 'school-outline', '#2563EB'], ['Healthcare', 'expense', 'medkit-outline', '#EC4899'], ['Entertainment', 'expense', 'film-outline', '#A855F7'], ['Travel', 'expense', 'airplane-outline', '#2563EB'], ['Personal care', 'expense', 'person-outline', '#F59E0B'], ['Family', 'expense', 'people-outline', '#EC4899'], ['Subscriptions', 'expense', 'repeat-outline', '#64748B'], ['Other expense', 'expense', 'ellipsis-horizontal-circle-outline', '#64748B'],
] as const;

export async function migrateToV1(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS wallets (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, currency TEXT NOT NULL, opening_balance_minor INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('income','expense')), icon TEXT NOT NULL, color TEXT NOT NULL, UNIQUE(name, kind));
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('income','expense')), amount_minor INTEGER NOT NULL CHECK(amount_minor > 0), currency TEXT NOT NULL, title TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id), wallet_id TEXT NOT NULL REFERENCES wallets(id), occurred_at TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON transactions(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category_id);
  `);
  const now = new Date().toISOString();
  await db.runAsync('INSERT OR IGNORE INTO wallets (id, name, currency, opening_balance_minor, created_at) VALUES (?, ?, ?, ?, ?)', 'default-cash', 'Cash', 'BDT', 0, now);
  for (const [name, kind, icon, color] of defaultCategories) {
    await db.runAsync('INSERT OR IGNORE INTO categories (id, name, kind, icon, color) VALUES (?, ?, ?, ?, ?)', `${kind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, kind, icon, color);
  }
  await db.execAsync('PRAGMA user_version = 1;');
}
