'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sqlitePath = process.env.SQLITE_PATH || './tests/data/invoices.sqlite';
const resolvedPath = path.resolve(process.cwd(), sqlitePath);

if (fs.existsSync(resolvedPath)) {
  try {
    fs.unlinkSync(resolvedPath);
    console.log(`Deleted SQLite database: ${resolvedPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.error('Cannot reset DB because the SQLite file is currently in use.');
      console.error('Stop any running Node server process, then run `npm run db:reset` again.');
      process.exit(1);
    }
    throw err;
  }
} else {
  console.log(`No SQLite file to delete at: ${resolvedPath}`);
}

console.log('Done. Next app startup will recreate schema and seed data automatically.');
