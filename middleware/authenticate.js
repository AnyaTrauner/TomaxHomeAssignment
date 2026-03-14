'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Fail at startup — the app must not run without a signing secret.
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

/**
 * authenticate middleware
 *
 * Expects:   Authorization: Bearer <jwt>
 *
 * On success, attaches `req.clientId` (string) from the verified token payload
 * and calls next().
 *
 * On failure, responds with:
 *   401 — header missing, token malformed, or signature invalid
 *   401 — token expired
 *
 * The middleware intentionally does NOT reveal whether the problem is a missing
 * header or a bad token — both return 401 with a generic message to avoid
 * giving attackers useful feedback.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (!payload.clientId || typeof payload.clientId !== 'string') {
      // Token is structurally valid but missing the required claim.
      return res.status(401).json({ error: 'Authentication required.' });
    }

    req.clientId = payload.clientId;
    return next();
  } catch (err) {
    // jwt.verify throws for expired, invalid signature, malformed, etc.
    return res.status(401).json({ error: 'Authentication required.' });
  }
}

module.exports = authenticate;
