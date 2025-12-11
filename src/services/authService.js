const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  createUser,
  getUserByEmail,
  updateUserTokenById,
} = require('../db/users');

const ROLE = {
  INACTIVE: 'inactive',
  ONBOARD: 'onboard',
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin',
};

const ROLE_RANK = {
  [ROLE.INACTIVE]: 0,
  [ROLE.ONBOARD]: 1,
  [ROLE.GUEST]: 2,
  [ROLE.USER]: 3,
  [ROLE.ADMIN]: 4,
};

class AuthError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function signup({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new AuthError('Email and password are required', 400, 'BAD_REQUEST');
  }

  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    throw new AuthError('User with this email already exists', 409, 'USER_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    role: ROLE.ONBOARD,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function login({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new AuthError('Email and password are required', 400, 'BAD_REQUEST');
  }

  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.role || user.role === ROLE.ONBOARD || user.role === ROLE.INACTIVE) {
    throw new AuthError('Account is awaiting approval by an admin', 403, 'NOT_APPROVED');
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new AuthError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken();
  await updateUserTokenById(user.id, token);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

module.exports = {
  signup,
  login,
  AuthError,
  ROLE,
  ROLE_RANK,
};
