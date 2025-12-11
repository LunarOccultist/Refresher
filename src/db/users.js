const { getDb } = require('./index');
const log = require('../log');

function createUser({ email, passwordHash, role = 'user', token = null }) {
  const db = getDb();
  const sql = `
    INSERT INTO user (email, password_hash, token, role)
    VALUES (?, ?, ?, ?)
  `;

  const params = [email, passwordHash, token, role];

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        log.error(`Failed to create user for email "${email}": ${err.message}`);
        return reject(err);
      }
      log.debug(`Created user ${this.lastID} for email "${email}"`);
      resolve(this.lastID);
    });
  }).then((id) => getUserById(id));
}

function getUserById(id) {
  const db = getDb();
  const sql = 'SELECT * FROM user WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        log.error(`Failed to get user by id ${id}: ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function getUserByEmail(email) {
  const db = getDb();
  const sql = 'SELECT * FROM user WHERE email = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [email], (err, row) => {
      if (err) {
        log.error(`Failed to get user by email "${email}": ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function getUserByToken(token) {
  const db = getDb();
  const sql = 'SELECT * FROM user WHERE token = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [token], (err, row) => {
      if (err) {
        log.error(`Failed to get user by token: ${err.message}`);
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function updateUserTokenById(id, token) {
  const db = getDb();
  const sql = 'UPDATE user SET token = ? WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [token, id], function onRun(err) {
      if (err) {
        log.error(`Failed to update token for user id=${id}: ${err.message}`);
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

function updateUserRoleById(id, role) {
  const db = getDb();
  const sql = 'UPDATE user SET role = ? WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [role, id], function onRun(err) {
      if (err) {
        log.error(`Failed to update role for user id=${id}: ${err.message}`);
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

function updateUserProfileById(id, { email, displayName, avatar }) {
  const db = getDb();
  const sql = `
    UPDATE user
    SET email = ?, display_name = ?, avatar = ?
    WHERE id = ?
  `;

  const params = [email, displayName ?? null, avatar ?? null, id];

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        log.error(`Failed to update profile for user id=${id}: ${err.message}`);
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

function updateUserPasswordHashById(id, passwordHash) {
  const db = getDb();
  const sql = 'UPDATE user SET password_hash = ? WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [passwordHash, id], function onRun(err) {
      if (err) {
        log.error(`Failed to update password for user id=${id}: ${err.message}`);
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

function updateUserAvatarById(id, avatar) {
  const db = getDb();
  const sql = 'UPDATE user SET avatar = ? WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [avatar, id], function onRun(err) {
      if (err) {
        log.error(`Failed to update avatar for user id=${id}: ${err.message}`);
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

function listUsers() {
  const db = getDb();
  const sql = 'SELECT id, email, role, token FROM user ORDER BY id DESC';

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        log.error(`Failed to list users: ${err.message}`);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByToken,
  updateUserTokenById,
  updateUserRoleById,
  updateUserProfileById,
  updateUserPasswordHashById,
  updateUserAvatarById,
  listUsers,
};
