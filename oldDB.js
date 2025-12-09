const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { log } = require('./utility.js');
const config = require('./config.json');

const status = { connected: false };
let db = null;

function connect() {
  return new Promise((resolve, reject) => {
    if (!config.database || !config.database.path) {
      return reject(new Error("Config database path missing"));
    }

    const dbPath = path.isAbsolute(config.database.path)
      ? config.database.path
      : path.join(__dirname, config.database.path);

    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        log.error(`Failed DB connection: ${err.message}`);
        status.connected = false;
        return reject(err);
      }

      log.debug(`Connected to database at ${dbPath}`);

      const sql = `
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT UNIQUE,
          est_bc REAL,
          est_cp REAL,
          job_cost REAL,
          inv_t REAL,
          inv_p REAL,
          inv_d REAL,
          co_bc REAL,
          co_cp REAL,
          updated DATETIME
        );
      `;

      db.run(sql, (err) => {
        if (err) {
          log.error(`Failed to initialize projects table: ${err.message}`);
          status.connected = false;
          return reject(err);
        }
        log.debug('Database Initialized');
        status.connected = true;
        resolve();
      });
    });
  });
}

function close() {
  if (db) {
    db.close((err) => {
      if (err) log.error(`Failed to close database: ${err.message}`);
      else {
        log.success('Database connection closed');
        status.connected = false;
      }
    });
  }
}

// Select fresh projects
function getProjects() {
  return new Promise((resolve, reject) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const sql = `
      SELECT * 
      FROM projects
      WHERE updated IS NULL OR updated <= ?
      ORDER BY id
    `;
    db.all(sql, [oneHourAgo], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Select all projects
function getAllProjects() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * 
      FROM projects
      ORDER BY id
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Update project
function updateProject(address, fields) {
  const columns = Object.keys(fields);
  const values = Object.values(fields);

  columns.push('updated');
  values.push(new Date().toISOString());

  const sql = `
    UPDATE projects
    SET ${columns.map(col => `${col} = ?`).join(', ')}
    WHERE address = ?
  `;
  db.run(sql, [...values, address], (err) => {
    if (err) log.error(`DB update failed: ${err.message}`);
  });
}

// Optional: Insert a new project if missing
function insertProject(address) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO projects (address) VALUES (?)`;
    db.run(sql, [address], function(err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

module.exports = {
  connect,
  close,
  getProjects,
  getAllProjects,
  updateProject,
  insertProject,
  status
};