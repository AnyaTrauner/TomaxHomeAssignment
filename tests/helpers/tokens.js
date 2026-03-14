/**
 * tests/helpers/tokens.js
 *
 * Generates signed JWT tokens for use in tests.
 * Uses the same JWT_SECRET that the authenticate middleware reads so tokens
 * are valid from the app's perspective.
 */

'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

/**
 * Returns a valid, signed Bearer token string for the given clientId.
 * @param {string} clientId
 * @param {object} [overrides]  - Override any JWT option (e.g. expiresIn)
 * @returns {string}  "Bearer <token>"
 */
function bearerToken(clientId, overrides = {}) {
  const token = jwt.sign(
    { clientId },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h', ...overrides }
  );
  return `Bearer ${token}`;
}

/**
 * Returns a Bearer token string that is already expired.
 * @param {string} clientId
 * @returns {string}
 */
function expiredBearerToken(clientId) {
  return bearerToken(clientId, { expiresIn: '-1s' });
}

module.exports = { bearerToken, expiredBearerToken };
