/**
 * tests/helpers/db.js
 *
 * Factory helpers that return pre-configured mock return values for db.query.
 *
 * Usage in tests:
 *
 *   const db = require('../../config/database');
 *   db.query.mockResolvedValue(dbResult.insertId(42));
 *   db.query.mockResolvedValue(dbResult.rows([{ id: 1, client_id: 'c1', ... }]));
 *   db.query.mockResolvedValue(dbResult.empty());
 *   db.query.mockRejectedValue(dbResult.dbError());
 *
 * mysql2's promise pool returns [results, fields] from every .query() call.
 * These helpers mirror that shape so the route handlers work without change.
 */

'use strict';

const db = {
  /**
   * Simulate a successful INSERT: returns [{ insertId }, []].
   * @param {number} id
   */
  insertId: (id) => [{ insertId: id }, []],

  /**
   * Simulate a successful SELECT returning one or more rows: [rows, []].
   * @param {object[]} rows
   */
  rows: (rows) => [rows, []],

  /**
   * Simulate a SELECT that returns no results: [[], []].
   */
  empty: () => [[], []],

  /**
   * Simulate a database error (e.g. connection lost, constraint violation).
   * @param {string} [message]
   */
  dbError: (message = 'ER_CONNECTION_LOST') => {
    const err = new Error(message);
    err.code = message;
    return err;
  },
};

module.exports = db;
