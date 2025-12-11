const { listUsers, updateUserRoleById } = require('../../db/users');
const { ROLE } = require('../../services/authService');
const log = require('../../log');

const ALLOWED_ROLES = new Set([
  ROLE.INACTIVE,
  ROLE.ONBOARD,
  ROLE.GUEST,
  ROLE.USER,
  ROLE.ADMIN,
]);

async function getUsers(req, res) {
  try {
    const users = await listUsers();
    return res.json(users);
  } catch (err) {
    log.error(`getUsers failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to list users' });
  }
}

async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const changes = await updateUserRoleById(numericId, role);
    return res.json({ id: numericId, role, changes });
  } catch (err) {
    log.error(`updateUserRole failed for id=${id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
}

module.exports = {
  getUsers,
  updateUserRole,
};
