/*
This is the original code:
const mysql = require('mysql2'); 
const db = mysql.createConnection({host: 'db.internal', user: 'admin', password: 'password123', database: 'invoices_db' }); 
db.connect((err) => { 
    if (err) { console.log('Database connection error:', err); } }); 
module.exports = db;
*/
'use strict';
require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verify connectivity at startup so the process fails fast rather than
// surfacing errors only when the first request arrives.
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
    process.exit(1);
  }
  console.log('Database connection pool established.');
  connection.release();
});

module.exports = pool.promise();
