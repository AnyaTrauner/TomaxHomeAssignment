'use strict';

/**
 * tests/invoices.happyflow.test.js
 *
 * Extra positive-path integration coverage.
 * Focuses on realistic happy flows that chain multiple successful operations.
 */

const request = require('supertest');

jest.mock('../config/database', () => ({ query: jest.fn() }));

const app = require('../app');
const db = require('../config/database');
const dbResult = require('./helpers/db');
const { clients, invoiceRows, postBodies } = require('./fixtures');

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('Happy flow — create then read', () => {
  test('client creates invoice and then successfully reads the same invoice', async () => {
    const createdId = 123;

    // 1) POST insert result
    db.query.mockResolvedValueOnce(dbResult.insertId(createdId));

    // 2) GET select result
    db.query.mockResolvedValueOnce(
      dbResult.rows([
        {
          id: createdId,
          client_id: clients.owner.id,
          amount: postBodies.valid.amount,
          description: postBodies.valid.description,
          created_at: '2026-03-17T12:00:00.000Z',
        },
      ])
    );

    const postRes = await request(app)
      .post('/invoices')
      .set('Authorization', clients.owner.token)
      .send(postBodies.valid);

    expect(postRes.status).toBe(201);
    expect(postRes.body).toEqual({ id: createdId });

    const getRes = await request(app)
      .get(`/invoices/${createdId}`)
      .set('Authorization', clients.owner.token);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toMatchObject({
      id: createdId,
      client_id: clients.owner.id,
      amount: postBodies.valid.amount,
      description: postBodies.valid.description,
    });

    // Ensure the expected DB query order happened.
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[0][0]).toMatch(/INSERT INTO invoices/i);
    expect(db.query.mock.calls[1][0]).toMatch(/SELECT id, client_id, amount, description, created_at FROM invoices WHERE id = \?/i);
  });
});

describe('Happy flow — multiple successful reads', () => {
  test('same authenticated owner can read different owned invoices successfully', async () => {
    db.query
      .mockResolvedValueOnce(dbResult.rows([invoiceRows.firstInvoice]))
      .mockResolvedValueOnce(dbResult.rows([invoiceRows.ownedByOwner]));

    const first = await request(app)
      .get('/invoices/1')
      .set('Authorization', clients.owner.token);

    const second = await request(app)
      .get('/invoices/42')
      .set('Authorization', clients.owner.token);

    expect(first.status).toBe(200);
    expect(first.body.id).toBe(1);

    expect(second.status).toBe(200);
    expect(second.body.id).toBe(42);
    expect(second.body.client_id).toBe(clients.owner.id);
  });
});
