const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'workflow.db');

// Open DB
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err);
  } else {
    console.log('SQLite database opened at', dbPath);
  }
});

// Apply pragmas for better durability & concurrency
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA busy_timeout = 5000");

  // Generic settings table (for arbitrary config)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(section, name)
    )
  `);

  // Logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT,
      created_at TEXT NOT NULL
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)');

  // Secrets table (values are encrypted at app layer)
  db.run(`
    CREATE TABLE IF NOT EXISTS secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      value_encrypted TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
});

/**
 * SETTINGS HELPERS
 */
function listSettings(section, callback) {
  if (section) {
    db.all(
      'SELECT section, name, value, created_at, updated_at FROM settings WHERE section = ? ORDER BY name',
      [section],
      callback
    );
  } else {
    db.all(
      'SELECT section, name, value, created_at, updated_at FROM settings ORDER BY section, name',
      [],
      callback
    );
  }
}

function getSetting(section, name, callback) {
  db.get(
    'SELECT section, name, value, created_at, updated_at FROM settings WHERE section = ? AND name = ?',
    [section, name],
    callback
  );
}

function upsertSetting(section, name, value, callback) {
  const now = new Date().toISOString();
  db.run(
    `
      INSERT INTO settings (section, name, value, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(section, name) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    [section, name, value, now, now],
    function (err) {
      callback(err);
    }
  );
}

function deleteSetting(section, name, callback) {
  db.run(
    'DELETE FROM settings WHERE section = ? AND name = ?',
    [section, name],
    callback
  );
}

/**
 * PA API CONFIG HELPERS (using settings table)
 * We store:
 *  - accessKey
 *  - secretKey
 *  - partnerTag
 *  - marketplace
 *  - region
 *  - host
 */
function getPaapiConfig(callback) {
  listSettings('paapi', (err, rows) => {
    if (err) return callback(err);

    if (!rows || rows.length === 0) {
      return callback(null, null);
    }

    const map = new Map();
    rows.forEach((r) => map.set(r.name, r.value));

    const accessKey = map.get('accessKey') || '';
    const secretKey = map.get('secretKey') || '';
    const partnerTag = map.get('partnerTag') || '';
    const marketplace = map.get('marketplace') || '';
    const region = map.get('region') || '';
    const host = map.get('host') || '';

    const anyRow = rows[0];

    callback(null, {
      accessKey,
      secretKey,
      partnerTag,
      marketplace,
      region,
      host,
      createdAt: anyRow.created_at,
      updatedAt: anyRow.updated_at
    });
  });
}

function upsertPaapiConfig(config, callback) {
  const {
    accessKey = '',
    secretKey = '',
    partnerTag = '',
    marketplace = '',
    region = '',
    host = ''
  } = config || {};

  const tasks = [
    (cb) => upsertSetting('paapi', 'accessKey', accessKey, cb),
    (cb) => upsertSetting('paapi', 'secretKey', secretKey, cb),
    (cb) => upsertSetting('paapi', 'partnerTag', partnerTag, cb),
    (cb) => upsertSetting('paapi', 'marketplace', marketplace, cb),
    (cb) => upsertSetting('paapi', 'region', region, cb),
    (cb) => upsertSetting('paapi', 'host', host, cb)
  ];

  let index = 0;
  function next(err) {
    if (err) return callback(err);
    if (index >= tasks.length) return callback(null);
    const fn = tasks[index++];
    fn(next);
  }
  next();
}

function deletePaapiConfig(callback) {
  const fields = ['accessKey', 'secretKey', 'partnerTag', 'marketplace', 'region', 'host'];
  const tasks = fields.map(
    (name) => (cb) => deleteSetting('paapi', name, cb)
  );

  let index = 0;
  function next(err) {
    if (err) return callback(err);
    if (index >= tasks.length) return callback(null);
    const fn = tasks[index++];
    fn(next);
  }
  next();
}

/**
 * LOGGING HELPERS
 */
function logEvent(level, message, context, callback) {
  const now = new Date().toISOString();
  const ctx = context ? JSON.stringify(context) : null;
  db.run(
    'INSERT INTO logs (level, message, context, created_at) VALUES (?, ?, ?, ?)',
    [level, message, ctx, now],
    function (err) {
      if (callback) callback(err, this && this.lastID);
    }
  );
}

function listLogs(options, callback) {
  const limit = Math.min(Math.max(options.limit || 100, 1), 1000);
  const level = options.level;

  let sql = 'SELECT id, level, message, context, created_at FROM logs';
  const params = [];

  if (level) {
    sql += ' WHERE level = ?';
    params.push(level);
  }
  sql += ' ORDER BY created_at DESC, id DESC LIMIT ?';
  params.push(limit);

  db.all(sql, params, callback);
}

function deleteLog(id, callback) {
  db.run('DELETE FROM logs WHERE id = ?', [id], callback);
}

/**
 * SECRETS HELPERS
 */
function listSecrets(callback) {
  db.all(
    'SELECT id, name, value_encrypted, created_at, updated_at FROM secrets ORDER BY name',
    [],
    callback
  );
}

function getSecret(name, callback) {
  db.get(
    'SELECT id, name, value_encrypted, created_at, updated_at FROM secrets WHERE name = ?',
    [name],
    callback
  );
}

function upsertSecret(name, valueEncrypted, callback) {
  const now = new Date().toISOString();
  db.run(
    `
      INSERT INTO secrets (name, value_encrypted, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        value_encrypted = excluded.value_encrypted,
        updated_at = excluded.updated_at
    `,
    [name, valueEncrypted, now, now],
    function (err) {
      callback(err);
    }
  );
}

function deleteSecret(name, callback) {
  db.run('DELETE FROM secrets WHERE name = ?', [name], callback);
}

module.exports = {
  db,
  // settings
  listSettings,
  getSetting,
  upsertSetting,
  deleteSetting,
  // paapi config
  getPaapiConfig,
  upsertPaapiConfig,
  deletePaapiConfig,
  // logs
  logEvent,
  listLogs,
  deleteLog,
  // secrets
  listSecrets,
  getSecret,
  upsertSecret,
  deleteSecret
};
