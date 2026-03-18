# Invoicing API

A lightweight B2B SaaS invoicing REST API built with Node.js, Express, SQLite (dev/test), and MySQL (production).

---

## Run localy

Step-by-step guide for getting the server running on a fresh machine with SQLite.
Production can use MySQL via environment config.

### Prerequisites

Install these tools if they are not already present.

| Tool | Minimum version | Download |
|------|-----------------|----------|
| **Node.js** | 20 LTS | https://nodejs.org |
| **Git** | any recent | https://git-scm.com |
| **jq** *(optional)* | any | https://jqlang.github.io/jq — pretty-prints JSON in curl responses |

Verify installs:

```bash
node -v        # should print v20.x or higher
git --version
```

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd TomaxHomeAssignment
```

### Step 2 — Install Node dependencies

```bash
npm install
```

### Step 3 — Create the environment file

```bash
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to any random string of **32+ characters**.

```dotenv
NODE_ENV=development
PORT=3000
DB_PROVIDER=sqlite
SQLITE_PATH=./tests/data/invoices.sqlite
JWT_SECRET=replace-this-with-a-long-random-secret-at-least-32-chars
```

Provider defaults:
- dev/test: SQLite
- production: MySQL

> **Never commit `.env` to source control.**

Provider defaults:
- dev/test: SQLite
- production: MySQL

> **Never commit `.env` to source control.**

### Step 4 — Initialize local SQLite database

```bash
npm run db:init
```

This creates `./tests/data/invoices.sqlite`, applies schema from `tests/db/sqlite-schema.sql`, and inserts demo rows from `tests/db/sqlite-seed.sql` when the table is empty.

### Step 5 — Start the API

```bash
npm run dev
```

The server starts on **http://localhost:3000** and auto-restarts on file changes.

Expected output includes:

```
SQLite database opened at .../tests/data/invoices.sqlite
Server listening on port 3000
```

### Step 6 — Generate a demo JWT

All endpoints require an `Authorization` header in the form `Bearer YOUR_TOKEN`.

Demo client IDs:
- `demo-client-acme`
- `demo-client-globex`
- `demo-client-initech`

Generate a token:

```bash
npm run token demo-client-acme
```

### Step 7 — Make your first request

```bash
curl -s http://localhost:3000/invoices/1 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

PowerShell fallback (no `jq`):

```powershell
$token = "YOUR_TOKEN"
Invoke-RestMethod -Uri "http://localhost:3000/invoices/1" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 10
```

### Step 8 — Reset demo data

```bash
npm run db:reset
# then start app again (or run npm run db:init)
```

### Step 9 — Run tests

```bash
npm test
```

Expected: **41 tests, 0 failures**.

### Useful commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start API with auto-restart |
| `npm start` | Start API (no auto-restart) |
| `npm run db:init` | Create/verify SQLite schema + seed |
| `npm run db:reset` | Delete SQLite DB file |
| `npm run token <clientId>` | Generate a signed JWT |
| `npm test` | Run test suite |

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `jq : The term 'jq' is not recognized...` | `jq` is not installed on this machine | Install `jq`, or use `Invoke-RestMethod ... \| ConvertTo-Json` |
| `401 Authentication required.` | Token format issue or `JWT_SECRET` mismatch | Use raw token (no `< >`) and regenerate via `npm run token ...` |
| `no such table: invoices` | DB file exists but schema wasn't initialized | Run `npm run db:init` (or `npm run db:reset` then restart) |
| Port 3000 already in use | Another process is bound to 3000 | Change `PORT` in `.env` and restart |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` (default) or `production` |
| `PORT` | No | Port the HTTP server binds to (default `3000`) |
| `DB_PROVIDER` | No | `sqlite` or `mysql` (defaults: sqlite in non-prod, mysql in prod) |
| `SQLITE_PATH` | Conditionally | Path to local SQLite DB file (used when `DB_PROVIDER=sqlite`, default `./tests/data/invoices.sqlite`) |
| `DB_HOST` | Conditionally | MySQL host (used when `DB_PROVIDER=mysql`) |
| `DB_USER` | Conditionally | MySQL username (used when `DB_PROVIDER=mysql`) |
| `DB_PASSWORD` | Conditionally | MySQL password (used when `DB_PROVIDER=mysql`) |
| `DB_NAME` | Conditionally | MySQL database name (used when `DB_PROVIDER=mysql`) |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT tokens — use 32+ random characters |

---

## Authentication

### Assumption

All API endpoints are protected. The API uses **JWT Bearer token** authentication.

This mechanism was chosen because:

- It is stateless — no session store is needed.
- The `clientId` claim embedded in the token is the authoritative identity for every request, which makes ownership checks simple and tamper-proof.
- It is a well-understood standard with strong library support (`jsonwebtoken`).

For a real deployment, tokens would be issued by an identity/auth service (e.g., Auth0, a dedicated login endpoint). For local development or testing you can generate a token manually (see below).

### How to authenticate

Include a signed JWT in the `Authorization` header of every request:

```
Authorization: Bearer YOUR_TOKEN
```

### Required JWT claims

| Claim | Type | Description |
|-------|------|-------------|
| `clientId` | `string` | The ID of the client making the request. Must match the `client_id` stored on the invoice for ownership-protected endpoints. |
| `exp` | `number` | Standard expiry claim — tokens without an expiry are rejected by most JWT libraries by default; set one. |

**Algorithm:** `HS256` (HMAC-SHA256 with `JWT_SECRET`).

### Error responses

| Status | Meaning |
|--------|---------|
| `401 Authentication required.` | Header is missing, token is malformed, signature is invalid, or the token has expired. |
| `403 Access denied.` | Token is valid but the authenticated `clientId` does not own the requested resource. |

### Generating a test token

```js
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { clientId: 'client-abc-123' },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '1h' }
);
console.log(token);
```

---

## Testing

### Running the suite

```bash
npm test
```

No running SQLite instance is required. The database layer (`config/database.js`) is replaced with a Jest mock in every test file, so tests are fully self-contained and can run from a clean clone.

For a full explanation of the testing approach and scenario-by-scenario coverage, see [tests.md](tests.md).

### Framework choices

| Tool | Why |
|------|-----|
| **Jest** | Industry-standard Node.js test runner; built-in mocking, assertions, and coverage |
| **Supertest** | Drives the full Express middleware stack over HTTP without binding a real port |

### Architecture decision — `app.js` vs `server.js`

`app.js` exports the configured Express application **without calling `app.listen()`**. The server is started by a separate `server.js` entry point. This is the standard pattern for testable Express apps:

- Supertest can `require('../app')` and make requests without any port being bound.
- `npm start` runs `server.js`, which calls `listen()` exactly once.
- There is no conditional `if (require.main === module)` noise inside `app.js`.

### How the DB is mocked

Each test file mocks `config/database.js` at the top using Jest's module mock:

```js
jest.mock('../config/database', () => ({ query: jest.fn() }));
```

This completely replaces the module before any route code is loaded. The real SQLite file opening and init logic inside `config/database.js` **never run during tests**.

Individual tests then configure what `db.query` resolves or rejects to using helpers from `tests/helpers/db.js`.

### How auth is tested

Tests use the same `JWT_SECRET` that the app reads at runtime. The secret is set by `tests/setup.js` (a Jest `setupFiles` entry that runs before any module is imported). The `tests/helpers/tokens.js` module provides:

- `bearerToken(clientId)` — returns a valid `Authorization: Bearer YOUR_TOKEN` header value
- `expiredBearerToken(clientId)` — same but already expired

### Test file structure

```
tests/
  setup.js                   Sets JWT_SECRET and NODE_ENV before modules load
  helpers/
    tokens.js                JWT generation helpers
    db.js                    Mock return-value builders for db.query
  invoices.post.test.js      POST /invoices — auth, validation, success, DB errors
  invoices.get.test.js       GET /invoices/:id — auth, ownership, success, DB errors
```

### Coverage summary

| Behaviour | Covered by |
|-----------|-----------|
| Valid `POST /invoices` → 201 | `invoices.post.test.js` |
| Missing / invalid `amount` (6 cases) | `invoices.post.test.js` |
| Missing / invalid `description` (4 cases) | `invoices.post.test.js` |
| Multiple validation errors returned together | `invoices.post.test.js` |
| `clientId` sourced from JWT not body | `invoices.post.test.js` |
| No/invalid/expired/wrong-secret/missing-claim JWT on POST | `invoices.post.test.js` |
| DB error on `POST` → generic 500 | `invoices.post.test.js` |
| Valid `GET /invoices/:id` → 200 | `invoices.get.test.js` |
| Invoice not found → 404 | `invoices.get.test.js` |
| Invoice owned by different client → 403 | `invoices.get.test.js` |
| 403 does not leak the real owner's `clientId` | `invoices.get.test.js` |
| Non-integer / zero / negative `:id` → 400 | `invoices.get.test.js` |
| Parameterised query used (no inline ID) | `invoices.get.test.js` |
| No/invalid/expired/wrong-secret/missing-claim JWT on GET | `invoices.get.test.js` |
| DB error on `GET` → generic 500 | `invoices.get.test.js` |

---

## API Reference

### `POST /invoices`

Create a new invoice for the authenticated client.

**Auth:** Required (JWT). The `clientId` is taken from the token — not the request body.

**Request body** (`application/json`):

| Field | Type | Constraints |
|-------|------|-------------|
| `amount` | `number` | Positive, finite |
| `description` | `string` | Non-empty, max 500 characters |

**Responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `201` | `{ "id": 42 }` | Invoice created |
| `400` | `{ "errors": [...] }` | Validation failed |
| `401` | `{ "error": "..." }` | Not authenticated |
| `500` | `{ "error": "..." }` | Unexpected server error |

---

### `GET /invoices/:id`

Return a single invoice by ID.

**Auth:** Required (JWT). The invoice is only returned if the authenticated client owns it.

**Path parameter:** `id` — strict positive integer (no floats, no alphanumeric suffixes, no leading zeros).

**Responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{ id, client_id, amount, description, created_at }` | Success |
| `400` | `{ "error": "Invoice ID must be a positive integer." }` | Invalid ID format |
| `401` | `{ "error": "Authentication required." }` | Not authenticated |
| `403` | `{ "error": "Access denied." }` | Invoice exists but belongs to a different client |
| `404` | `{ "error": "Invoice not found." }` | No invoice with that ID |
| `500` | `{ "error": "..." }` | Unexpected server error |

> **Why 403 instead of 404 for wrong owner?**  
> The spec explicitly requests 403 in this case. A 403 tells the calling client that the invoice exists but is not theirs, which is useful feedback in a B2B context where a client might accidentally use the wrong ID. If your threat model requires hiding existence entirely, swap the 403 response to 404.

---

## Project structure

```
server.js               Entry point — starts the HTTP server
app.js                  Express application (exported without listen; used by tests)
config/
  database.js           SQLite adapter with auto schema/seed init
middleware/
  authenticate.js       JWT verification; attaches req.clientId
routes/
  invoices.js           /invoices route handlers
tests/
  data/                 SQLite DB files (`invoices.sqlite`, `test.sqlite`)
  db/
    sqlite-schema.sql   CREATE TABLE statements for SQLite
    sqlite-seed.sql     Demo data for three fictional clients
  scripts/
    generate-token.js   Mint a signed JWT for a given clientId (local dev helper)
    sqlite-init.js      Initialize SQLite schema/seed
    sqlite-reset.js     Delete SQLite DB file to reset local data
  setup.js              Jest setupFiles — sets env vars before module load
  fixtures.js           Shared mock data (clients, invoice rows, POST bodies)
  helpers/
    tokens.js           JWT generation helpers for tests
    db.js               Mock return-value builders for db.query
  invoices.post.test.js POST /invoices test suite
  invoices.get.test.js  GET /invoices/:id test suite
jest.config.js          Jest configuration
.env.example            Template for required environment variables (Docker defaults pre-filled)
fix-notes.md            Code-review notes from the initial audit
```
