const { listUsers, updateUserRoleById } = require('../../db/users');
const adminService = require('../../services/adminService');
const { ROLE, AuthError } = require('../../services/authService');
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

async function getUser(req, res) {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const user = await adminService.getUser(numericId);
    return res.json(user);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`getUser (admin) failed for id=${id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to load user' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { email, displayName, role } = req.body || {};
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const user = await adminService.updateUser(numericId, { email, displayName, role });
    return res.json(user);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`updateUser (admin) failed for id=${id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

async function changeUserPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body || {};
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    await adminService.changeUserPassword(numericId, { newPassword });
    return res.status(204).send();
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`changeUserPassword (admin) failed for id=${id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to update password' });
  }
}

async function uploadUserAvatar(req, res) {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Avatar file is required' });
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const relativePath = `assets/users/${file.filename}`;
    const user = await adminService.updateAvatar(numericId, relativePath);
    return res.json(user);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`uploadUserAvatar (admin) failed for id=${id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
}

async function createUser(req, res) {
  const { email, displayName, role, newPassword } = req.body || {};

  try {
    const user = await adminService.createUserForAdmin({ email, displayName, role, newPassword });
    return res.status(201).json(user);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`createUser (admin) failed for email=${email}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

module.exports = {
  getUsers,
  updateUserRole,
  getUser,
  updateUser,
  changeUserPassword,
  uploadUserAvatar,
  createUser,
};
