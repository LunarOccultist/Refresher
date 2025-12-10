const { getDb } = require('./index');
const log = require('../log');

function upsertJob({ address, active = true, mondayId = null }) {
  const db = getDb();

  const sql = `
    INSERT INTO job (address, active, monday_id)
    VALUES (?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET
      active = excluded.active,
      monday_id = COALESCE(excluded.monday_id, job.monday_id)
  `;

  const params = [
    address,
    active ? 1 : 0,
    mondayId,
  ];

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        log.error(`Failed to upsert job for address "${address}": ${err.message}`);
        return reject(err);
      }
      log.debug(`Upserted job for address "${address}"`);
      resolve();
    });
  }).then(() => getJobByAddress(address));
}

function getJobById(id) {
  const db = getDb();
  const sql = 'SELECT * FROM job WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        log.error(`Failed to get job by id ${id}: ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function getJobByAddress(address) {
  const db = getDb();
  const sql = 'SELECT * FROM job WHERE address = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [address], (err, row) => {
      if (err) {
        log.error(`Failed to get job by address "${address}": ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function setJobActiveByAddress(address, active) {
  const db = getDb();
  const sql = 'UPDATE job SET active = ? WHERE address = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [active ? 1 : 0, address], function onRun(err) {
      if (err) {
        log.error(`Failed to set active=${active} for address "${address}": ${err.message}`);
        return reject(err);
      }
      log.debug(`Set active=${active} for address "${address}" (${this.changes} row(s) affected)`);
      resolve(this.changes);
    });
  });
}

function listJobs({ activeOnly = false } = {}) {
  const db = getDb();

  let sql = 'SELECT * FROM job';
  const params = [];

  if (activeOnly) {
    sql += ' WHERE active = 1';
  }

  sql += ' ORDER BY id DESC';

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        log.error(`Failed to list jobs (activeOnly=${activeOnly}): ${err.message}`);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

module.exports = {
  upsertJob,
  getJobById,
  getJobByAddress,
  setJobActiveByAddress,
  listJobs,
};
