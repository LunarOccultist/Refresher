const bcrypt = require('bcryptjs');
const {
  getUserById,
  getUserByEmail,
  updateUserProfileById,
  updateUserPasswordHashById,
  updateUserAvatarById,
} = require('../db/users');
const { AuthError } = require('./authService');

async function getMe(userId) {
  const user = await getUserById(userId);
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name || null,
    avatar: user.avatar || null,
    role: user.role,
  };
}

async function updateProfile(userId, { email, displayName, avatar }) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!trimmedEmail) {
    throw new AuthError('Email is required', 400, 'BAD_REQUEST');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  const existing = await getUserByEmail(trimmedEmail);
  if (existing && existing.id !== userId) {
    throw new AuthError('Another account is already using this email', 409, 'EMAIL_TAKEN');
  }

  await updateUserProfileById(userId, {
    email: trimmedEmail,
    displayName: displayName || user.display_name || null,
    avatar: avatar !== undefined ? avatar : user.avatar,
  });

  return getMe(userId);
}

async function updateAvatar(userId, avatarPath) {
  const user = await getUserById(userId);
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  await updateUserAvatarById(userId, avatarPath);
  return getMe(userId);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new AuthError('Current and new password are required', 400, 'BAD_REQUEST');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) {
    throw new AuthError('Current password is incorrect', 400, 'BAD_CURRENT_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordHashById(userId, passwordHash);
}

module.exports = {
  getMe,
  updateProfile,
  changePassword,
  updateAvatar,
};
