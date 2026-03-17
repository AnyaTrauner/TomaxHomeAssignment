'use strict';

/**
 * tests/fixtures.js
 *
 * Centralised test data used across the invoice test suites.
 *
 * Having all mock data in one place means:
 *  - IDs and client references stay consistent across test files.
 *  - Adding a new test scenario doesn't require duplicating data.
 *  - Reviewers can see the full data model at a glance.
 *
 * Nothing in this file connects to the database or starts a server.
 */

const { bearerToken } = require('./helpers/tokens');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/**
 * Two synthetic client identities used throughout the test suite.
 *
 * OWNER   — the authenticated caller in most tests
 * STRANGER — a different client used to exercise 403 ownership checks
 */
const clients = {
  owner: {
    id: 'client-owner-001',
    get token() {
      return bearerToken(this.id);
    },
  },
  stranger: {
    id: 'client-stranger-002',
    get token() {
      return bearerToken(this.id);
    },
  },
};

// ---------------------------------------------------------------------------
// Invoice rows  (shape returned by the DB SELECT)
// ---------------------------------------------------------------------------

/**
 * A fully-populated invoice row owned by clients.owner.
 * Used as the default happy-path DB return value for GET /invoices/:id.
 */
const invoiceRows = {
  /** Single invoice belonging to the owner client. */
  ownedByOwner: {
    id: 42,
    client_id: clients.owner.id,
    amount: 150.0,
    description: 'Consulting — March 2026',
    created_at: '2026-03-01T09:00:00.000Z',
  },

  /** Same invoice id but attributed to the stranger — used for 403 tests. */
  ownedByStranger: {
    id: 42,
    client_id: clients.stranger.id,
    amount: 270.5,
    description: 'Design retainer — March 2026',
    created_at: '2026-03-05T14:00:00.000Z',
  },

  /** An invoice with id = 1, used for boundary / minimum-id tests. */
  firstInvoice: {
    id: 1,
    client_id: clients.owner.id,
    amount: 50.0,
    description: 'Initial setup fee',
    created_at: '2026-01-01T00:00:00.000Z',
  },
};

// ---------------------------------------------------------------------------
// POST /invoices request bodies
// ---------------------------------------------------------------------------

const postBodies = {
  /** A fully valid POST body — should produce 201. */
  valid: {
    amount: 99.99,
    description: 'Web design retainer',
  },

  /** Valid body with whitespace padding — description should be trimmed before insert. */
  paddedDescription: {
    amount: 10.0,
    description: '  padded description  ',
  },

  // --- invalid amount variants ---

  missingAmount: {
    description: 'Valid description',
  },

  amountAsString: {
    amount: '100',
    description: 'Valid description',
  },

  amountZero: {
    amount: 0,
    description: 'Valid description',
  },

  amountNegative: {
    amount: -50,
    description: 'Valid description',
  },

  amountNull: {
    amount: null,
    description: 'Valid description',
  },

  amountInfinityString: {
    amount: 'Infinity',
    description: 'Valid description',
  },

  // --- invalid description variants ---

  missingDescription: {
    amount: 50,
  },

  descriptionEmpty: {
    amount: 50,
    description: '',
  },

  descriptionWhitespace: {
    amount: 50,
    description: '   ',
  },

  descriptionNumber: {
    amount: 50,
    description: 123,
  },

  // --- multiple-field failures ---

  bothInvalid: {
    amount: -1,
    description: '',
  },

  empty: {},
};

module.exports = { clients, invoiceRows, postBodies };
