import * as SQLite from 'expo-sqlite';

const syncTables = ['categories','wallets','transactions','transfers','budgets','savings_goals','savings_contributions','debts','debt_payments','recurring_transactions','recurring_occurrences','bill_reminders','bill_payments'] as const;

export async function migrateToV4(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE sync_queue (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
      modified_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      UNIQUE(entity,record_id)
    );
    CREATE INDEX sync_queue_sequence_idx ON sync_queue(sequence);
    CREATE TABLE sync_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `);
  for (const table of syncTables) {
    await db.execAsync(`
      CREATE TRIGGER ${table}_sync_insert AFTER INSERT ON ${table} BEGIN
        INSERT INTO sync_queue(entity,record_id,operation,modified_at) VALUES ('${table}',NEW.id,'upsert',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(entity,record_id) DO UPDATE SET operation='upsert',modified_at=excluded.modified_at,attempts=0,last_error=NULL;
      END;
      CREATE TRIGGER ${table}_sync_update AFTER UPDATE ON ${table} BEGIN
        INSERT INTO sync_queue(entity,record_id,operation,modified_at) VALUES ('${table}',NEW.id,'upsert',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(entity,record_id) DO UPDATE SET operation='upsert',modified_at=excluded.modified_at,attempts=0,last_error=NULL;
      END;
      CREATE TRIGGER ${table}_sync_delete AFTER DELETE ON ${table} BEGIN
        INSERT INTO sync_queue(entity,record_id,operation,modified_at) VALUES ('${table}',OLD.id,'delete',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(entity,record_id) DO UPDATE SET operation='delete',modified_at=excluded.modified_at,attempts=0,last_error=NULL;
      END;
      INSERT INTO sync_queue(entity,record_id,operation,modified_at) SELECT '${table}',id,'upsert',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM ${table};
    `);
  }
  await db.execAsync('PRAGMA user_version = 4;');
}
