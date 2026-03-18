# Tests Documentation

This document explains the testing approach used in this project and what each test suite validates.

---

## Goals

The tests are designed to verify:

- Correct API behavior for happy paths and error paths
- Authentication and authorization correctness
- Input validation and boundary handling
- Safe failure behavior (no sensitive error leakage)
- SQL injection resistance through parameterized queries

---

## Stack

- **Test runner:** Jest
- **HTTP integration testing:** Supertest
- **Style:** Route-level integration tests with mocked DB layer

Run all tests:

```bash
npm test
```

Current total: **53 tests** across 3 suites.

---

## Architecture of the tests

### 1) Express app tested directly

Tests import `app` (not `server`) so no real port binding is needed.

### 2) Database is mocked in each suite

Each suite uses:

```js
jest.mock('../config/database', () => ({ query: jest.fn() }));
```

This keeps tests deterministic and independent from SQLite/MySQL runtime state.

### 3) JWT auth is realistic

- `tests/setup.js` sets a real `JWT_SECRET` for tests.
- `tests/helpers/tokens.js` creates signed valid/expired tokens.
- Tests also create malformed/wrong-secret/wrong-claim tokens to assert 401 behavior.

### 4) Shared fixtures reduce duplication

`tests/fixtures.js` provides:

- Reusable clients/tokens
- Seed-like invoice rows
- POST request bodies (valid + invalid variants)

### 5) Helper for DB return shapes

`tests/helpers/db.js` builds mocked `db.query` return values with the same shape the route code expects (`[rows, metadata]`, insert result with `insertId`).

---

## Test suites and coverage

## `tests/invoices.post.test.js`

### Authentication tests

Validates `POST /invoices` rejects unauthorized requests:

- Missing Authorization header → `401`
- Non-JWT token string → `401`
- Expired token → `401`
- Wrong signing secret → `401`
- Missing `clientId` claim → `401`
- `clientId` wrong type (`number`, `object`, `array`) → `401`
- `clientId` whitespace-only string → `401`
- Non-Bearer scheme (`Basic ...`) → `401`

### Input validation tests

Validates `POST /invoices` request body rules:

- `amount` missing/string/zero/negative/null/Infinity-string → `400`
- `description` missing/empty/whitespace/number → `400`
- `description` length boundary:
  - exactly 500 chars → accepted (`201`)
  - 501 chars → rejected (`400`)
- multiple invalid fields return multiple validation errors

### Success tests

- Valid payload returns `201` with new invoice ID
- `clientId` comes from JWT (not request body tampering)
- Description is trimmed before insert
- JWT `clientId` is normalized (trimmed)

### Database error handling

- DB throw returns generic `500` response
- Internal DB error codes/details are not leaked to caller

---

## `tests/invoices.get.test.js`

### Authentication tests

Validates `GET /invoices/:id` requires valid JWT:

- Missing header / malformed token / expired / wrong secret / missing claim → `401`
- `clientId` wrong type (`number`, `object`, `array`) → `401`
- `clientId` whitespace-only → `401`

### Path parameter validation tests

Strict `id` validation checks:

- non-numeric string (`abc`) → `400`
- zero (`0`) → `400`
- negative (`-5`) → `400`
- float-like (`1.5`) → `400`
- alphanumeric suffix (`1abc`) → `400`
- leading zero (`01`) → `400`

### Ownership and existence tests

- invoice not found → `404`
- invoice exists but belongs to another client → `403`
- `403` payload does not leak real owner identity

### Success tests

- owner reading owned invoice returns `200` with expected payload
- query remains parameterized (no inline ID interpolation)
- smallest valid ID boundary (`1`) returns `200`

### Database error handling

- DB throw returns generic `500`
- internal details are not exposed

---

## `tests/invoices.happyflow.test.js`

Additional positive integration coverage:

- **Create → Read flow:**
  - client successfully creates invoice (`POST 201`)
  - same client reads created invoice (`GET 200`)
  - validates expected DB call order (insert then select)

- **Multiple successful reads:**
  - same authenticated owner can read multiple owned invoices successfully

---

## Design decisions

- **Why mock DB?**
  - Faster and deterministic tests
  - No dependency on local database state
  - Enables precise simulation of DB success/failure paths

- **Why include both positive and negative tests?**
  - Negative tests enforce security and validation guarantees
  - Positive tests prevent regressions in expected business behavior

- **Why keep route-level integration tests instead of pure unit tests?**
  - Exercises middleware + auth + validation + route logic together
  - Better confidence for real API behavior with minimal overhead

---

## How to extend tests safely

When adding tests:

1. Prefer existing fixtures from `tests/fixtures.js`
2. Use `dbResult` helpers instead of handcrafting DB mock shapes
3. Add both success and failure cases for every new rule
4. Keep error-message assertions broad where possible (assert status + key semantics)
5. Avoid coupling tests to implementation details not part of API contract
