const authService = require('../../services/authService');
const { getUserFromRequest } = require('../middleware/authMiddleware');
const { updateUserTokenById } = require('../../db/users');
const log = require('../../log');

async function signup(req, res) {
  const { email, password } = req.body || {};

  try {
    const user = await authService.signup({ email, password });
    return res.status(201).json({
      message: 'Account created; pending approval by an admin.',
      user,
    });
  } catch (err) {
    if (err.name === 'AuthError' && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }

    log.error(`signup failed for email="${email}": ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to sign up' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  try {
    const result = await authService.login({ email, password });

    // Persist token as httpOnly cookie for server-side checks (e.g., dashboard access)
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    res.cookie('authToken', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ONE_MONTH_MS,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.name === 'AuthError' && err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }

    log.error(`login failed for email="${email}": ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to log in' });
  }
}

async function logout(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (user) {
      try {
        await updateUserTokenById(user.id, null);
      } catch (err) {
        // log but do not fail logout entirely
        log.error(`Failed to clear token for logout user=${user.id}: ${err.stack || err.message}`);
      }
    }

    res.cookie('authToken', '', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 0,
    });

    return res.status(204).send();
  } catch (err) {
    log.error(`logout failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to log out' });
  }
}

module.exports = {
  signup,
  login,
  logout,
};
