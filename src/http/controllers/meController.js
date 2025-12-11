const meService = require('../../services/meService');
const { AuthError } = require('../../services/authService');
const log = require('../../log');

async function getMe(req, res) {
  try {
    const data = await meService.getMe(req.user.id);
    return res.json(data);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`getMe failed for user=${req.user && req.user.id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}

async function updateProfile(req, res) {
  const { email, displayName, avatar } = req.body || {};

  try {
    const data = await meService.updateProfile(req.user.id, { email, displayName, avatar });
    return res.json(data);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`updateProfile failed for user=${req.user && req.user.id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  try {
    await meService.changePassword(req.user.id, { currentPassword, newPassword });
    return res.status(204).send();
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`changePassword failed for user=${req.user && req.user.id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}

async function uploadAvatar(req, res) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Avatar file is required' });
  }

  try {
    const relativePath = `assets/users/${file.filename}`;
    const data = await meService.updateAvatar(req.user.id, relativePath);
    return res.json(data);
  } catch (err) {
    if (err instanceof AuthError && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    log.error(`uploadAvatar failed for user=${req.user && req.user.id}: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
}

module.exports = {
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
};
