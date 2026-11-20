import * as SQLite from 'expo-sqlite';

export async function migrateToV5(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE valuation_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE valuation_rates (currency TEXT PRIMARY KEY NOT NULL, rate_scaled INTEGER NOT NULL CHECK(rate_scaled>0));
    INSERT INTO valuation_settings(key,value) SELECT 'base_currency',currency FROM wallets ORDER BY created_at LIMIT 1;
    INSERT INTO valuation_rates(currency,rate_scaled) SELECT currency,100000000 FROM wallets GROUP BY currency HAVING currency=(SELECT value FROM valuation_settings WHERE key='base_currency');
    PRAGMA user_version = 5;
  `);
}
