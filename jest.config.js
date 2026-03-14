/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',

  // Runs before the test framework is installed — used to set env vars that
  // must be present before any module (e.g. authenticate.js) is first imported.
  setupFiles: ['./tests/setup.js'],

  testMatch: ['**/tests/**/*.test.js'],

  // Automatically clear mock instances, calls, and results between every test.
  // This ensures mock.calls[0] in one test does not bleed into the next test.
  clearMocks: true,

  // Print each test name as it runs.
  verbose: true,
};

module.exports = config;
