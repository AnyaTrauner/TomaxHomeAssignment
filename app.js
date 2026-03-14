'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const invoiceRoutes = require('./routes/invoices');

const app = express();

// Security headers on every response.
app.use(helmet());

// Request logging — use 'combined' in production for full Apache-style logs.
// Silenced in test environment to keep test output readable.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(express.json());

// Routes
app.use('/invoices', invoiceRoutes);

// 404 handler — must come after all routes.
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Centralised error handler — 4 params required by Express to recognise it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Log the full error server-side for observability.
  console.error(err);

  // Never send internal error details (stack traces, DB messages) to the client.
  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
});

module.exports = app;
