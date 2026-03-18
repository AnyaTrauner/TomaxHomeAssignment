'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const sqlite3 = require('sqlite3');

function resolveProvider() {
  const explicit = process.env.DB_PROVIDER;
  if (explicit) {
    return explicit.toLowerCase();
  }
  return process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite';
}

const provider = resolveProvider();

function createMysqlAdapter() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const promisePool = pool.promise();

  const ready = promisePool
    .query('SELECT 1')
    .then(() => {
      console.log('MySQL connection pool established.');
    })
    .catch((err) => {
      console.error('Failed to connect to MySQL:', err.message);
      process.exit(1);
    });

  return {
    query: (sql, params = []) => promisePool.query(sql, params),
    ready,
    close: () => promisePool.end(),
  };
}

function createSqliteAdapter() {
  const sqlitePath = process.env.SQLITE_PATH || './tests/data/invoices.sqlite';
  const resolvedSqlitePath = path.resolve(process.cwd(), sqlitePath);
  const dataDir = path.dirname(resolvedSqlitePath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new sqlite3.Database(resolvedSqlitePath, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message);
      process.exit(1);
    }
    console.log(`SQLite database opened at ${resolvedSqlitePath}`);
  });

  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  function all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  function exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async function initializeDatabase() {
    const schemaPath = path.resolve(process.cwd(), 'tests/db/sqlite-schema.sql');
    const seedPath = path.resolve(process.cwd(), 'tests/db/sqlite-seed.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await exec(schemaSql);

    const row = await get('SELECT COUNT(*) AS count FROM invoices');
    if (!row || row.count === 0) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await exec(seedSql);
      console.log('SQLite seed data inserted.');
    }
  }

  const initializationPromise = initializeDatabase().catch((err) => {
    console.error('Failed to initialize SQLite database:', err.message);
    process.exit(1);
  });

  async function query(sql, params = []) {
    await initializationPromise;

    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('SELECT')) {
      const rows = await all(sql, params);
      return [rows, []];
    }

    const result = await run(sql, params);
    return [{ insertId: result.lastID, affectedRows: result.changes }, []];
  }

  function close() {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  return { query, ready: initializationPromise, close };
}

let adapter;

if (provider === 'mysql') {
  adapter = createMysqlAdapter();
} else if (provider === 'sqlite') {
  adapter = createSqliteAdapter();
} else {
  console.error(`Unsupported DB_PROVIDER: ${provider}. Use "mysql" or "sqlite".`);
  process.exit(1);
}

module.exports = adapter;
