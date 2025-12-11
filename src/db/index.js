const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const log = require('../log');

const DB_PATH = path.resolve(__dirname, 'database.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(DB_PATH);
    dbInstance.serialize(() => {
      dbInstance.run('PRAGMA foreign_keys = ON');
      initializeSchema(dbInstance);
    });
  }

  return dbInstance;
}

function initializeSchema(db) {
  db.run(
    `CREATE TABLE IF NOT EXISTS job (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monday_id INTEGER,
      address TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    (err) => {
      if (err) {
        log.error(`Failed to ensure job table: ${err.message}`);
      } else {
        log.debug('Ensured job table exists');
      }
    },
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS job_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      est_bc REAL,
      est_cp REAL,
      job_cost REAL,
      inv_t REAL,
      inv_p REAL,
      co_bc REAL,
      co_cp REAL,
      FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) {
        log.error(`Failed to ensure job_snapshot table: ${err.message}`);
      } else {
        log.debug('Ensured job_snapshot table exists');
      }
    },
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      token TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      display_name TEXT,
      avatar TEXT
    )`,
    (err) => {
      if (err) {
        log.error(`Failed to ensure user table: ${err.message}`);
      } else {
        log.debug('Ensured user table exists');

        // Best-effort migration for existing databases: add missing columns
        db.all("PRAGMA table_info(user)", [], (pragmaErr, rows) => {
          if (pragmaErr) {
            log.error(`Failed to inspect user table schema: ${pragmaErr.message}`);
            return;
          }

          const existingCols = new Set(rows.map((r) => r.name));

          if (!existingCols.has('display_name')) {
            db.run('ALTER TABLE user ADD COLUMN display_name TEXT', (alterErr) => {
              if (alterErr) {
                log.error(`Failed to add display_name column: ${alterErr.message}`);
              } else {
                log.debug('Added display_name column to user table');
              }
            });
          }

          if (!existingCols.has('avatar')) {
            db.run('ALTER TABLE user ADD COLUMN avatar TEXT', (alterErr) => {
              if (alterErr) {
                log.error(`Failed to add avatar column: ${alterErr.message}`);
              } else {
                log.debug('Added avatar column to user table');
              }
            });
          }
        });
      }
    },
  );
}

function closeDb() {
  if (!dbInstance) return;

  dbInstance.close();
  dbInstance = null;
}

module.exports = {
  getDb,
  closeDb,
};