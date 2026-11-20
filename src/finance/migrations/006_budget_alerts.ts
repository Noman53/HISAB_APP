import * as SQLite from 'expo-sqlite';

export async function migrateToV6(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE budget_alert_events (budget_id TEXT NOT NULL, period_key TEXT NOT NULL, threshold INTEGER NOT NULL CHECK(threshold IN (80,100)), created_at TEXT NOT NULL, PRIMARY KEY(budget_id,period_key,threshold));
    PRAGMA user_version = 6;
  `);
}
