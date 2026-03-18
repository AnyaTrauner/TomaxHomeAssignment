'use strict';

require('dotenv').config();

const app = require('./app');
const db = require('./config/database');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  try {
    await db.ready;
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Startup aborted: database is not ready.', err);
    process.exit(1);
  }
}

startServer();
