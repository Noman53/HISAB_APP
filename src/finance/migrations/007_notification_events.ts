import * as SQLite from 'expo-sqlite';

export async function migrateToV7(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE goal_alert_events (
      goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
      threshold INTEGER NOT NULL CHECK(threshold IN (50,75,100)),
      created_at TEXT NOT NULL,
      PRIMARY KEY(goal_id, threshold)
    );
    PRAGMA user_version = 7;
  `);
}
