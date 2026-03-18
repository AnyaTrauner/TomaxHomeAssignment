'use strict';

const db = require('../../config/database');

(async () => {
  try {
    await db.ready;
    console.log('SQLite init completed successfully.');
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('SQLite init failed:', err.message);
    process.exit(1);
  }
})();
