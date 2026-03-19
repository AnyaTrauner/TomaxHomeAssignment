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

// Use a separate SQLite file for tests.
process.env.SQLITE_PATH = './tests/data/test.sqlite';
