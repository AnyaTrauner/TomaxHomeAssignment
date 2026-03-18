#!/usr/bin/env node
'use strict';

/**
 * tests/scripts/generate-token.js
 *
 * Generates a signed JWT for a given clientId and prints it to stdout.
 * Useful for testing the API locally with curl or a REST client.
 *
 * Usage:
 *   node tests/scripts/generate-token.js <clientId> [expiresIn]
 *
 * Examples:
 *   node tests/scripts/generate-token.js demo-client-acme
 *   node tests/scripts/generate-token.js demo-client-globex 24h
 *
 * The JWT_SECRET is read from a .env file in the project root (via dotenv).
 * Make sure your .env exists and has JWT_SECRET set before running this.
 *
 * Output:
 *   Prints three lines:
 *     1. The raw token  (paste into Authorization header)
 *     2. A ready-to-use Authorization header value
 *     3. A ready-to-use curl snippet for GET /invoices/1
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

const clientId  = process.argv[2];
const expiresIn = process.argv[3] || '8h';

if (!clientId) {
  console.error('Usage: node tests/scripts/generate-token.js <clientId> [expiresIn]');
  console.error('');
  console.error('Demo client IDs (from seed data):');
  console.error('  demo-client-acme');
  console.error('  demo-client-globex');
  console.error('  demo-client-initech');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET is not set. Copy .env.example to .env and fill in the value.');
  process.exit(1);
}

const token = jwt.sign(
  { clientId },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn }
);

const header = `Bearer ${token}`;

console.log('\nClient ID  :', clientId);
console.log('Expires in :', expiresIn);
console.log('\n--- Token ---');
console.log(token);
console.log('\n--- Authorization header ---');
console.log(header);
console.log('\n--- curl example (GET /invoices/1) ---');
console.log(`curl -s http://localhost:3000/invoices/1 \\\n  -H "Authorization: ${header}" | jq`);
console.log('');
