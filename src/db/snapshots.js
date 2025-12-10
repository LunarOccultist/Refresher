const { getDb } = require('./index');
const log = require('../log');

function createSnapshot({
  jobId,
  estBc,
  estCp,
  jobCost,
  invT,
  invP,
  coBc,
  coCp,
}) {
  const db = getDb();
  const sql = `
    INSERT INTO job_snapshot (
      job_id,
      est_bc,
      est_cp,
      job_cost,
      inv_t,
      inv_p,
      co_bc,
      co_cp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    jobId,
    estBc ?? null,
    estCp ?? null,
    jobCost ?? null,
    invT ?? null,
    invP ?? null,
    coBc ?? null,
    coCp ?? null,
  ];

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        log.error(`Failed to create snapshot for jobId=${jobId}: ${err.message}`);
        return reject(err);
      }
      log.debug(`Created snapshot ${this.lastID} for jobId=${jobId}`);
      resolve(this.lastID);
    });
  }).then((id) => getSnapshotById(id));
}

function getSnapshotById(id) {
  const db = getDb();
  const sql = 'SELECT * FROM job_snapshot WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        log.error(`Failed to get snapshot by id ${id}: ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function getLatestSnapshotForJob(jobId) {
  const db = getDb();
  const sql = `
    SELECT *
    FROM job_snapshot
    WHERE job_id = ?
    ORDER BY captured_at DESC, id DESC
    LIMIT 1
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [jobId], (err, row) => {
      if (err) {
        log.error(`Failed to get latest snapshot for jobId=${jobId}: ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function listSnapshotsForJob(jobId, { limit } = {}) {
  const db = getDb();

  let sql = `
    SELECT *
    FROM job_snapshot
    WHERE job_id = ?
    ORDER BY captured_at DESC, id DESC
  `;
  const params = [jobId];

  if (typeof limit === 'number') {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        log.error(`Failed to list snapshots for jobId=${jobId}: ${err.message}`);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

module.exports = {
  createSnapshot,
  getSnapshotById,
  getLatestSnapshotForJob,
  listSnapshotsForJob,
};