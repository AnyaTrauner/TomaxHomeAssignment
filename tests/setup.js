/**
 * tests/setup.js
 *
 * This file runs once per worker BEFORE the test framework is installed and
 * BEFORE any module in the test file is imported. It is registered via
 * jest.config.js `setupFiles`.
 *
 * Responsibility: set process.env values that module-level code reads at
 * import time (e.g. JWT_SECRET check in middleware/authenticate.js).
 */

'use strict';

process.env.NODE_ENV = 'test';

// A fixed secret used throughout all tests. Never use this value outside tests.
process.env.JWT_SECRET = 'test-only-jwt-secret-32-chars-min!!';

// Provide dummy DB env vars so dotenv-loaded config doesn't complain.
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
