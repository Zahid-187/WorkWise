'use strict';
const path      = require('path');
const fs        = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'workwise.db');
let _db = null;

async function getDb() {
  if (_db) return _db;

  const SQL  = await initSqlJs();
  const file = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  const db   = file ? new SQL.Database(file) : new SQL.Database();

  db.run('PRAGMA foreign_keys = ON;');

  // Persist DB file after every mutating operation
  function save() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  // Convert sql.js result to array-of-objects
  function toObjects(res) {
    if (!res || !res.length) return [];
    const { columns, values } = res[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  }

  // Convert named-param object {@name: val} → positional array
  function namedToPositional(sql, obj) {
    const keys = [...sql.matchAll(/@(\w+)/g)].map(m => m[1]);
    if (keys.length) return keys.map(k => (k in obj ? obj[k] : null));
    return Object.values(obj);
  }

  // Normalise arguments for prepare().run/get/all
  function normalise(sql, args) {
    if (!args || args.length === 0) return [];
    if (args.length === 1 && Array.isArray(args[0]))  return args[0];
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null)
      return namedToPositional(sql, args[0]);
    return args; // positional spread: .all(p1, p2, ...)
  }

  const wrapper = {
    run(sql, params = []) {
      db.run(sql, params);
      const mods  = db.getRowsModified();
      const idRes = db.exec('SELECT last_insert_rowid()');
      const lastId = idRes[0]?.values[0][0] ?? 0;
      save();
      return { changes: mods, lastInsertRowid: lastId };
    },

    exec(sql) { db.run(sql); save(); },

    get(sql, params = []) { return toObjects(db.exec(sql, params))[0]; },

    all(sql, params = []) { return toObjects(db.exec(sql, params)); },

    prepare(sql) {
      return {
        run: (...a) => wrapper.run(sql, normalise(sql, a)),
        get: (...a) => wrapper.get(sql, normalise(sql, a)),
        all: (...a) => wrapper.all(sql, normalise(sql, a)),
      };
    },

    pragma() {}, // no-op; pragmas set directly above
    close()  { db.close(); },
  };

  _db = wrapper;
  return wrapper;
}

// Schema DDL — called once at server start
async function initSchema() {
  const db = await getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT    NOT NULL,
      role               TEXT    NOT NULL,
      industry           TEXT    NOT NULL,
      avatar_emoji       TEXT    NOT NULL DEFAULT '👤',
      department         TEXT,
      hourly_rate        REAL    NOT NULL DEFAULT 15.00,
      preferred_language TEXT    NOT NULL DEFAULT 'en',
      created_at         TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id      INTEGER NOT NULL,
      date           TEXT    NOT NULL,
      clock_in       TEXT,
      clock_out      TEXT,
      hours_worked   REAL    DEFAULT 0,
      overtime_hours REAL    DEFAULT 0,
      notes          TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id         INTEGER NOT NULL,
      industry          TEXT    NOT NULL,
      category          TEXT    NOT NULL DEFAULT 'other',
      description       TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'open',
      severity          TEXT    NOT NULL DEFAULT 'medium',
      is_payslip_dispute INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    DEFAULT (datetime('now')),
      resolved_at       TEXT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      industry   TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'other',
      sentiment  TEXT NOT NULL DEFAULT 'neutral',
      message    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

module.exports = { getDb, initSchema };
