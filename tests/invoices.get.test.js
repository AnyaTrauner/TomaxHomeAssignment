'use strict';

/**
 * tests/invoices.get.test.js
 *
 * Integration tests for GET /invoices/:id.
 *
 * The database layer is replaced with a Jest mock so no real MySQL instance
 * is needed. Tests drive the full Express middleware stack (authentication,
 * ownership check, error handling) via supertest.
 */

const request = require('supertest');

// --- DB mock -----------------------------------------------------------------
jest.mock('../config/database', () => ({ query: jest.fn() }));

const app = require('../app');
const db = require('../config/database');
const { expiredBearerToken } = require('./helpers/tokens');
const dbResult = require('./helpers/db');
const { clients, invoiceRows } = require('./fixtures');

// ---------------------------------------------------------------------------

const OWNER_TOKEN = clients.owner.token;

// Silence console.error for expected 500 tests.
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe('GET /invoices/:id — authentication', () => {
  test('401 when Authorization header is absent', async () => {
    const res = await request(app).get('/invoices/42');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('401 when token is a random string (not a JWT)', async () => {
    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', 'Bearer garbage-value');
    expect(res.status).toBe(401);
  });

  test('401 when token is expired', async () => {
    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', expiredBearerToken(clients.owner.id));
    expect(res.status).toBe(401);
  });

  test('401 when token is signed with wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const badToken = jwt.sign(
      { clientId: clients.owner.id },
      'wrong-secret',
      { algorithm: 'HS256' }
    );
    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  test('401 when JWT is valid but has no clientId claim', async () => {
    const jwt = require('jsonwebtoken');
    const tokenNoClientId = jwt.sign(
      { sub: 'u-999' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', `Bearer ${tokenNoClientId}`);
    expect(res.status).toBe(401);
  });

  test.each([
    ['number', 123],
    ['object', { id: 'client-1' }],
    ['array', ['client-1']],
  ])('401 when JWT clientId claim is %s', async (_label, badClientId) => {
    const jwt = require('jsonwebtoken');
    const badTypeToken = jwt.sign(
      { clientId: badClientId },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', `Bearer ${badTypeToken}`);

    expect(res.status).toBe(401);
  });

  test('401 when JWT clientId is a whitespace-only string', async () => {
    const jwt = require('jsonwebtoken');
    const tokenBlankClientId = jwt.sign(
      { clientId: '   ' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', `Bearer ${tokenBlankClientId}`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Path parameter validation
// ---------------------------------------------------------------------------

describe('GET /invoices/:id — path parameter validation', () => {
  test('400 when id is a non-numeric string', async () => {
    const res = await request(app)
      .get('/invoices/abc')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('400 when id is zero', async () => {
    const res = await request(app)
      .get('/invoices/0')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(400);
  });

  test('400 when id is negative', async () => {
    const res = await request(app)
      .get('/invoices/-5')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(400);
  });

  test('400 when id is a float', async () => {
    // Strict validator rejects float-like IDs.
    const res = await request(app)
      .get('/invoices/1.5')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(400);
  });

  test('400 when id contains alphanumeric suffix', async () => {
    const res = await request(app)
      .get('/invoices/1abc')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(400);
  });

  test('400 when id has leading zero', async () => {
    const res = await request(app)
      .get('/invoices/01')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Ownership check (404 vs 403)
// ---------------------------------------------------------------------------

describe('GET /invoices/:id — ownership check', () => {
  test('404 when no invoice with that id exists', async () => {
    db.query.mockResolvedValueOnce(dbResult.empty());

    const res = await request(app)
      .get('/invoices/99999')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('403 when invoice exists but belongs to a different client', async () => {
    db.query.mockResolvedValueOnce(dbResult.rows([invoiceRows.ownedByStranger]));

    // Request made by OWNER_CLIENT_ID, but invoice owned by OTHER_CLIENT_ID.
    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('403 response does not expose the real owner clientId', async () => {
    db.query.mockResolvedValueOnce(dbResult.rows([invoiceRows.ownedByStranger]));

    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(403);
    // The response body must not leak who owns the invoice.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(clients.stranger.id);
  });
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe('GET /invoices/:id — success', () => {
  test('200 with invoice data when authenticated client owns the invoice', async () => {
    db.query.mockResolvedValueOnce(dbResult.rows([invoiceRows.ownedByOwner]));

    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', OWNER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: invoiceRows.ownedByOwner.id,
      client_id: invoiceRows.ownedByOwner.client_id,
      amount: invoiceRows.ownedByOwner.amount,
      description: invoiceRows.ownedByOwner.description,
    });
  });

  test('uses a parameterised query (passes id as a bound parameter, not inline)', async () => {
    db.query.mockResolvedValueOnce(dbResult.rows([invoiceRows.ownedByOwner]));

    await request(app)
      .get('/invoices/42')
      .set('Authorization', OWNER_TOKEN);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/\?/);         // has at least one placeholder
    expect(sql).not.toMatch(/= 42/);   // id is NOT interpolated into the SQL
    expect(params).toContain(42);
  });

  test('200 is returned for invoice id = 1 (boundary: smallest valid id)', async () => {
    db.query.mockResolvedValueOnce(dbResult.rows([invoiceRows.firstInvoice]));

    const res = await request(app)
      .get('/invoices/1')
      .set('Authorization', OWNER_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Database error handling
// ---------------------------------------------------------------------------

describe('GET /invoices/:id — database errors', () => {
  test('500 with generic message when DB throws', async () => {
    db.query.mockRejectedValueOnce(dbResult.dbError('ER_CONNECTION_LOST'));

    const res = await request(app)
      .get('/invoices/42')
      .set('Authorization', OWNER_TOKEN);

    expect(res.status).toBe(500);
    // Must not leak internal error details to the caller.
    expect(res.body.error).not.toMatch(/ER_CONNECTION_LOST/i);
    expect(res.body).not.toHaveProperty('stack');
  });
});
