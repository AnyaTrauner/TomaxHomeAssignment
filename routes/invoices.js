'use strict';

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticate = require('../middleware/authenticate');

// All invoice routes require a valid JWT.
router.use(authenticate);

// --- helpers -----------------------------------------------------------------

function validateInvoiceBody(body) {
  const errors = [];
  const { amount, description } = body;

  // clientId is NOT taken from the body — it comes from the verified JWT
  // (see req.clientId set by the authenticate middleware).
  if (amount === undefined || amount === null || typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
    errors.push('amount is required and must be a positive number.');
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    errors.push('description is required and must be a non-empty string.');
  }

  return errors;
}

// --- routes ------------------------------------------------------------------

// Create invoice
router.post('/', async (req, res, next) => {
  const validationErrors = validateInvoiceBody(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  // Ignore any clientId in the body — the authoritative value comes from the
  // verified JWT so a client cannot create invoices on behalf of others.
  const { amount, description } = req.body;
  const clientId = req.clientId;

  try {
    // Parameterised query — never interpolate user input into SQL strings.
    const [result] = await db.query(
      'INSERT INTO invoices (client_id, amount, description, created_at) VALUES (?, ?, ?, NOW())',
      [clientId.trim(), amount, description.trim()]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    // Pass to the centralised error handler; do NOT leak db details to the caller.
    return next(err);
  }
});

// Get invoice by ID
router.get('/:id', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invoice ID must be a positive integer.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, client_id, amount, description, created_at FROM invoices WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      // Invoice does not exist at all.
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = rows[0];

    // Ownership check — the authenticated client must own this invoice.
    // We return 403 (not 404) so the client knows the resource exists but is
    // not theirs, which is more useful for debugging and matches REST convention.
    // If you prefer to hide existence entirely, change this to 404.
    if (invoice.client_id !== req.clientId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(invoice);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
