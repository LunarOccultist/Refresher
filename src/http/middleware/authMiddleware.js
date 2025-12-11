const { getUserByToken } = require('../../db/users');
const { ROLE, ROLE_RANK } = require('../../services/authService');
const log = require('../../log');

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;

  const parts = header.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.split('=');
    if (!rawName) continue;
    const name = rawName.trim();
    if (!name) continue;
    const value = rest.join('=').trim();
    cookies[name] = decodeURIComponent(value || '');
  }

  return cookies;
}

async function getUserFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.authToken;

  if (!token) return null;

  const user = await getUserByToken(token);
  return user || null;
}

async function requireDashboardAuth(req, res, next) {
  try {
    const user = await getUserFromRequest(req);

    if (!user || !user.role || user.role === ROLE.ONBOARD || user.role === ROLE.INACTIVE) {
      return res.redirect('/');
    }

    // Attach user to request for future use if needed
    req.user = user;

    log.debug(
      `[DASHBOARD] user id=${user.id} email="${user.email}" role=${user.role} -> ${
        req.method
      } ${req.originalUrl || req.url}`,
    );

    return next();
  } catch (err) {
    return res.redirect('/');
  }
}

async function requireAdminAuth(req, res, next) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!user.role || user.role !== ROLE.ADMIN) {
      return res.status(403).json({ error: 'Admin role required' });
    }

    req.user = user;

    log.debug(
      `[ADMIN] user id=${user.id} email="${user.email}" role=${user.role} -> ${
        req.method
      } ${req.originalUrl || req.url}`,
    );

    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to authorize request' });
  }
}

async function requireAuthJson(req, res, next) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!user.role || user.role === ROLE.ONBOARD || user.role === ROLE.INACTIVE) {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.user = user;

    log.debug(
      `[API] user id=${user.id} email="${user.email}" role=${user.role} -> ${
        req.method
      } ${req.originalUrl || req.url}`,
    );

    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to authorize request' });
  }
}

async function requireUserOrAdminJson(req, res, next) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!user.role || user.role === ROLE.ONBOARD || user.role === ROLE.INACTIVE) {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const rank = ROLE_RANK[user.role];
    const minRank = ROLE_RANK[ROLE.USER];

    if (typeof rank !== 'number' || rank < minRank) {
      return res.status(403).json({ error: 'User or admin role required' });
    }

    req.user = user;

    log.debug(
      `[API-UOrA] user id=${user.id} email="${user.email}" role=${user.role} -> ${
        req.method
      } ${req.originalUrl || req.url}`,
    );

    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to authorize request' });
  }
}

module.exports = {
  getUserFromRequest,
  requireDashboardAuth,
  requireAdminAuth,
  requireAuthJson,
  requireUserOrAdminJson,
};
