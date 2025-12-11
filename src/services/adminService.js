const bcrypt = require('bcryptjs');
const {
  createUser,
  getUserById,
  getUserByEmail,
  updateUserProfileById,
  updateUserPasswordHashById,
  updateUserAvatarById,
  updateUserRoleById,
} = require('../db/users');
const { AuthError, ROLE } = require('./authService');

const ALLOWED_ROLES = new Set([
  ROLE.INACTIVE,
  ROLE.ONBOARD,
  ROLE.GUEST,
  ROLE.USER,
  ROLE.ADMIN,
]);

async function getUser(userId) {
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

async function updateUser(userId, { email, displayName, role }) {
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

  const nextRole = role || user.role;
  if (!ALLOWED_ROLES.has(nextRole)) {
    throw new AuthError('Invalid role', 400, 'BAD_ROLE');
  }

  await updateUserProfileById(userId, {
    email: trimmedEmail,
    displayName: displayName || user.display_name || null,
    avatar: user.avatar,
  });

  if (nextRole !== user.role) {
    await updateUserRoleById(userId, nextRole);
  }

  return getUser(userId);
}

async function changeUserPassword(userId, { newPassword }) {
  if (!newPassword) {
    throw new AuthError('New password is required', 400, 'BAD_REQUEST');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordHashById(userId, passwordHash);
}

async function updateAvatar(userId, avatarPath) {
  const user = await getUserById(userId);
  if (!user) {
    throw new AuthError('User not found', 404, 'USER_NOT_FOUND');
  }

  await updateUserAvatarById(userId, avatarPath);
  return getUser(userId);
}

async function createUserForAdmin({ email, displayName, role, newPassword }) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!trimmedEmail || !newPassword) {
    throw new AuthError('Email and password are required', 400, 'BAD_REQUEST');
  }

  const existing = await getUserByEmail(trimmedEmail);
  if (existing) {
    throw new AuthError('User with this email already exists', 409, 'USER_EXISTS');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const nextRole = role || ROLE.ONBOARD;
  if (!ALLOWED_ROLES.has(nextRole)) {
    throw new AuthError('Invalid role', 400, 'BAD_ROLE');
  }

  const user = await createUser({
    email: trimmedEmail,
    passwordHash,
    role: nextRole,
  });

  await updateUserProfileById(user.id, {
    email: trimmedEmail,
    displayName: displayName || null,
    avatar: null,
  });

  return getUser(user.id);
}

module.exports = {
  getUser,
  updateUser,
  changeUserPassword,
  updateAvatar,
  createUserForAdmin,
};
