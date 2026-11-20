import * as SQLite from 'expo-sqlite';

export async function migrateToV2(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    ALTER TABLE wallets ADD COLUMN type TEXT NOT NULL DEFAULT 'cash';
    ALTER TABLE wallets ADD COLUMN icon TEXT NOT NULL DEFAULT 'wallet-outline';
    ALTER TABLE wallets ADD COLUMN color TEXT NOT NULL DEFAULT '#2563EB';
    CREATE TABLE transfers (
      id TEXT PRIMARY KEY NOT NULL,
      from_wallet_id TEXT NOT NULL REFERENCES wallets(id),
      to_wallet_id TEXT NOT NULL REFERENCES wallets(id),
      from_amount_minor INTEGER NOT NULL CHECK(from_amount_minor > 0),
      to_amount_minor INTEGER NOT NULL CHECK(to_amount_minor > 0),
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      exchange_rate_scaled INTEGER NOT NULL CHECK(exchange_rate_scaled > 0),
      rate_scale INTEGER NOT NULL CHECK(rate_scale > 0),
      fee_minor INTEGER NOT NULL DEFAULT 0 CHECK(fee_minor >= 0),
      occurred_at TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      CHECK(from_wallet_id <> to_wallet_id)
    );
    CREATE INDEX transfers_from_wallet_idx ON transfers(from_wallet_id, occurred_at DESC);
    CREATE INDEX transfers_to_wallet_idx ON transfers(to_wallet_id, occurred_at DESC);
    PRAGMA user_version = 2;
  `);
}
