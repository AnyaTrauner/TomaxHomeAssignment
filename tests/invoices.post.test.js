'use strict';

/**
 * tests/invoices.post.test.js
 *
 * Integration tests for POST /invoices.
 *
 * The database layer is replaced with a Jest mock so no real MySQL instance
 * is needed. Tests drive the full Express middleware stack (authentication,
 * validation, error handling) via supertest.
 */

const request = require('supertest');

// --- DB mock -----------------------------------------------------------------
// Must be declared before `require('app')` so Jest hoisting works correctly.
// The mock replaces config/database entirely; the real pool/connect code
// never executes. The `query` fn is a jest.fn() that tests configure per-case.
jest.mock('../config/database', () => ({ query: jest.fn() }));

const app = require('../app');
const db = require('../config/database');
const { expiredBearerToken, bearerToken } = require('./helpers/tokens');
const dbResult = require('./helpers/db');
const { clients, postBodies } = require('./fixtures');

// ---------------------------------------------------------------------------

const VALID_TOKEN = clients.owner.token;
const VALID_BODY  = postBodies.valid;

// Silence the centralised error handler's console.error for expected 500 tests.
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe('POST /invoices — authentication', () => {
  test('401 when Authorization header is absent', async () => {
    const res = await request(app).post('/invoices').send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when token is a random string (not a JWT)', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', 'Bearer not-a-jwt-at-all')
      .send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when token is expired', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', expiredBearerToken(clients.owner.id))
      .send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when token is signed with the wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const badToken = jwt.sign({ clientId: 'client-001' }, 'wrong-secret', {
      algorithm: 'HS256',
    });
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${badToken}`)
      .send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when token is valid JWT but missing clientId claim', async () => {
    const jwt = require('jsonwebtoken');
    const tokenNoClientId = jwt.sign(
      { userId: 'u-999' }, // wrong claim name
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${tokenNoClientId}`)
      .send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when JWT clientId is a whitespace-only string', async () => {
    const jwt = require('jsonwebtoken');
    const tokenBlankClientId = jwt.sign(
      { clientId: '   ' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${tokenBlankClientId}`)
      .send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when Authorization scheme is not Bearer', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('POST /invoices — input validation', () => {
  // amount -------------------------------------------------------------------

  test('400 when amount is missing', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.missingAmount);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('amount')])
    );
  });

  test('400 when amount is a string', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.amountAsString);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('amount')])
    );
  });

  test('400 when amount is zero', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.amountZero);
    expect(res.status).toBe(400);
  });

  test('400 when amount is negative', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.amountNegative);
    expect(res.status).toBe(400);
  });

  test('400 when amount is null', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.amountNull);
    expect(res.status).toBe(400);
  });

  test('400 when amount is Infinity (serialised as null by JSON)', async () => {
    // JSON.stringify(Infinity) === 'null', so the body arrives as { amount: null }.
    // Test that the string "Infinity" is also rejected.
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.amountInfinityString);
    expect(res.status).toBe(400);
  });

  // description --------------------------------------------------------------

  test('400 when description is missing', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.missingDescription);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('description')])
    );
  });

  test('400 when description is an empty string', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.descriptionEmpty);
    expect(res.status).toBe(400);
  });

  test('400 when description is whitespace only', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.descriptionWhitespace);
    expect(res.status).toBe(400);
  });

  test('400 when description is a number', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.descriptionNumber);
    expect(res.status).toBe(400);
  });

  // multiple errors at once --------------------------------------------------

  test('400 with errors for BOTH fields when both are invalid', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.bothInvalid);
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(2);
  });

  test('400 with errors for BOTH fields when body is completely empty', async () => {
    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.empty);
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe('POST /invoices — success', () => {
  test('201 with new invoice id when request is valid', async () => {
    db.query.mockResolvedValueOnce(dbResult.insertId(7));

    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 7 });
  });

  test('clientId is taken from the JWT, not from the request body', async () => {
    db.query.mockResolvedValueOnce(dbResult.insertId(8));

    await request(app)
      .post('/invoices')
      .set('Authorization', clients.stranger.token)
      // Even if the caller sends a different clientId in the body, it should
      // be ignored — the route uses req.clientId from the verified JWT.
      .send({ ...VALID_BODY, clientId: clients.owner.id });

    // Verify the INSERT was called with the token's clientId, not the body's.
    const [, params] = db.query.mock.calls[0];
    expect(params[0]).toBe(clients.stranger.id);
  });

  test('strips surrounding whitespace from description before inserting', async () => {
    db.query.mockResolvedValueOnce(dbResult.insertId(9));

    await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(postBodies.paddedDescription);

    const [, params] = db.query.mock.calls[0];
    expect(params[2]).toBe('padded description');
  });

  test('stores trimmed clientId when JWT has surrounding whitespace', async () => {
    db.query.mockResolvedValueOnce(dbResult.insertId(10));

    await request(app)
      .post('/invoices')
      .set('Authorization', bearerToken('  client-padded  '))
      .send(VALID_BODY);

    const [, params] = db.query.mock.calls[0];
    // clientId normalised by authenticate middleware — no surrounding whitespace in DB
    expect(params[0]).toBe('client-padded');
  });
});

// ---------------------------------------------------------------------------
// Database error handling
// ---------------------------------------------------------------------------

describe('POST /invoices — database errors', () => {
  test('500 with generic message when DB throws', async () => {
    db.query.mockRejectedValueOnce(dbResult.dbError('ER_DUP_ENTRY'));

    const res = await request(app)
      .post('/invoices')
      .set('Authorization', VALID_TOKEN)
      .send(VALID_BODY);

    expect(res.status).toBe(500);
    // Must not leak internal error details to the caller.
    expect(res.body.error).not.toMatch(/ER_DUP_ENTRY/i);
    expect(res.body).not.toHaveProperty('stack');
  });
});
