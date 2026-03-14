# Invoicing API

A lightweight B2B SaaS invoicing REST API built with Node.js, Express, and MySQL.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+  
- [Docker](https://www.docker.com/) (for the local MySQL instance)

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local `.env`

```bash
cp .env.example .env
```

The `.env.example` is pre-filled with the Docker Compose credentials. The only value you **must** set manually is `JWT_SECRET` — paste in any 32+ character random string:

```
JWT_SECRET=replace-this-with-a-long-random-string-at-least-32-chars
```

### 3. Start the database

```bash
npm run db:up
```

This starts a MySQL 8 container. On first boot it automatically runs `db/01_schema.sql` (creates the `invoices` table) then `db/02_seed.sql` (inserts demo data for three fictional clients). The data volume is persisted across restarts.

Wait ~10 seconds for MySQL to initialise on the very first run. You can check readiness with:

```bash
docker compose logs -f db
# Ready when you see: ready for connections
```

### 4. Generate a demo JWT

All endpoints require an `Authorization` header in the form `Bearer YOUR_TOKEN`. Use the token script to mint one for any of the seeded client IDs:

```bash
npm run token demo-client-acme
# or:
npm run token demo-client-globex
# or:
npm run token demo-client-initech
```

The script prints the raw token, a ready-to-paste header value, and a curl example.

### 5. Start the API

```bash
npm run dev      # auto-restarts on file changes
# or:
npm start
```

### 6. Make a request

```bash
# Substitute the token printed in step 4.
# Important: send the raw token value only (no angle brackets).
curl -s http://localhost:3000/invoices/1 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

If `jq` is not installed on Windows, use PowerShell-native formatting instead:

```powershell
$token = "your-token-without-angle-brackets"
Invoke-RestMethod -Uri "http://localhost:3000/invoices/1" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 10
```

### Resetting demo data

To wipe the database volume and re-seed from scratch:

```bash
npm run db:reset
```

### npm scripts reference

| Script | What it does |
|--------|-------------|
| `npm start` | Start the server (production mode) |
| `npm run dev` | Start with `--watch` (auto-restart on save) |
| `npm run db:up` | Start the MySQL container in the background |
| `npm run db:down` | Stop the MySQL container (data volume preserved) |
| `npm run db:reset` | Destroy the data volume and re-run schema + seed |
| `npm run token <clientId>` | Generate a signed JWT for a client ID |
| `npm test` | Run the test suite |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` (default) or `production` |
| `PORT` | No | Port the HTTP server binds to (default `3000`) |
| `DB_HOST` | Yes | MySQL host |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT tokens — use 32+ random characters |

**Never commit `.env` to source control.** `.env` is listed in `.gitignore`.  
A template with all required variable names (no values) is in `.env.example`.

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

No running MySQL instance is required. The database layer (`config/database.js`) is replaced with a Jest mock in every test file, so tests are fully self-contained and can run from a clean clone.

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

This completely replaces the module before any route code is loaded. The real MySQL pool, connection logic, and `process.exit` guard inside `config/database.js` **never run during tests**.

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
| `description` | `string` | Non-empty |

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

**Path parameter:** `id` — positive integer.

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
  database.js           MySQL connection pool (env-configured)
middleware/
  authenticate.js       JWT verification; attaches req.clientId
routes/
  invoices.js           /invoices route handlers
db/
  01_schema.sql         CREATE TABLE statements (auto-run by Docker on first start)
  02_seed.sql           Demo data for three fictional clients
scripts/
  generate-token.js     Mint a signed JWT for a given clientId (local dev helper)
tests/
  setup.js              Jest setupFiles — sets env vars before module load
  fixtures.js           Shared mock data (clients, invoice rows, POST bodies)
  helpers/
    tokens.js           JWT generation helpers for tests
    db.js               Mock return-value builders for db.query
  invoices.post.test.js POST /invoices test suite
  invoices.get.test.js  GET /invoices/:id test suite
docker-compose.yml      MySQL 8 service for local development
jest.config.js          Jest configuration
.env.example            Template for required environment variables (Docker defaults pre-filled)
fix-notes.md            Code-review notes from the initial audit
```
