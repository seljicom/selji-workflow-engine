import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// ----- Resolve __dirname under ESM -----
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// ----- Resolve DB path (supports external NAS override) -----
let dbPath;
if (process.env.EXTERNAL_DB_PATH) {
  dbPath = process.env.EXTERNAL_DB_PATH;
  console.log('🔗 Using external NAS DB:', dbPath);
} else {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'workflow.db');
  console.log('📦 Using internal Docker DB:', dbPath);
}

// ----- Open DB -----
const db = new Database(dbPath);

// ----- PRAGMAs -----
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

// ----- Schema initialization -----
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(section, name)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  created_at TEXT NOT NULL
);
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)");
db.exec("CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)");

db.exec(`
CREATE TABLE IF NOT EXISTS secrets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  value_encrypted TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

// ==============================================================
// SETTINGS API
// ==============================================================

function listSettings(section, callback) {
  try {
    const rows = section
      ? db.prepare("SELECT * FROM settings WHERE section=? ORDER BY name").all(section)
      : db.prepare("SELECT * FROM settings ORDER BY section, name").all();
    callback(null, rows);
  } catch (e) {
    callback(e);
  }
}

function getSetting(section, name, callback) {
  try {
    const row = db.prepare("SELECT * FROM settings WHERE section=? AND name=?")
                  .get(section, name);
    callback(null, row || null);
  } catch (e) {
    callback(e);
  }
}

function upsertSetting(section, name, value, callback) {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO settings (section, name, value, created_at, updated_at)
      VALUES(?,?,?,?,?)
      ON CONFLICT(section, name) DO UPDATE SET
        value=excluded.value,
        updated_at=excluded.updated_at
    `).run(section, name, value, now, now);
    callback(null);
  } catch (e) {
    callback(e);
  }
}

function deleteSetting(section, name, callback) {
  try {
    db.prepare("DELETE FROM settings WHERE section=? AND name=?").run(section, name);
    callback(null);
  } catch (e) {
    callback(e);
  }
}

// ==============================================================
// PAAPI CONFIG (FULLY FIXED — no recursion)
// ==============================================================

function getPaapiConfig(callback) {
  listSettings("paapi", (err, rows) => {
    if (err) return callback(err);
    if (!rows || rows.length === 0) return callback(null, null);

    const map = new Map(rows.map(r => [r.name, r.value]));
    const any = rows[0];

    callback(null, {
      accessKey: map.get("accessKey") || "",
      secretKey: map.get("secretKey") || "",
      partnerTag: map.get("partnerTag") || "",
      marketplace: map.get("marketplace") || "",
      region: map.get("region") || "",
      host: map.get("host") || "",
      createdAt: any.created_at,
      updatedAt: any.updated_at
    });
  });
}

function upsertPaapiConfig(config, callback) {
  try {
    const fields = [
      "accessKey", "secretKey", "partnerTag",
      "marketplace", "region", "host"
    ];

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO settings (section, name, value, created_at, updated_at)
      VALUES ('paapi', ?, ?, ?, ?)
      ON CONFLICT(section, name) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    db.transaction(() => {
      for (const field of fields) {
        const val = (config[field] || "").trim();
        stmt.run(field, val, now, now);
      }
    })();

    callback(null);
  } catch (err) {
    callback(err);
  }
}

function deletePaapiConfig(callback) {
  try {
    db.prepare("DELETE FROM settings WHERE section='paapi'").run();
    callback(null);
  } catch (err) {
    callback(err);
  }
}

// ==============================================================
// LOGGING API
// ==============================================================

function logEvent(level, message, context, callback) {
  try {
    const now = new Date().toISOString();
    const ctx = context ? JSON.stringify(context) : null;
    const info = db.prepare(`
      INSERT INTO logs(level, message, context, created_at)
      VALUES(?,?,?,?)
    `).run(level, message, ctx, now);
    callback(null, info.lastInsertRowid);
  } catch (e) {
    callback(e);
  }
}

function listLogs(options, callback) {
  try {
    const limit = Math.min(Math.max(options.limit || 100, 1), 1000);
    let sql = "SELECT * FROM logs";
    const params = [];

    if (options.level) {
      sql += " WHERE level=?";
      params.push(options.level);
    }
    sql += " ORDER BY created_at DESC, id DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    callback(null, rows);
  } catch (e) {
    callback(e);
  }
}

function deleteLog(id, callback) {
  try {
    db.prepare("DELETE FROM logs WHERE id=?").run(id);
    callback(null);
  } catch (e) {
    callback(e);
  }
}

// ==============================================================
// SECRETS API
// ==============================================================

function listSecrets(callback) {
  try {
    const rows = db.prepare("SELECT * FROM secrets ORDER BY name").all();
    callback(null, rows);
  } catch (e) {
    callback(e);
  }
}

function getSecret(name, callback) {
  try {
    const row = db.prepare("SELECT * FROM secrets WHERE name=?").get(name);
    callback(null, row || null);
  } catch (e) {
    callback(e);
  }
}

function upsertSecret(name, valueEncrypted, callback) {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO secrets(name, value_encrypted, created_at, updated_at)
      VALUES(?,?,?,?)
      ON CONFLICT(name) DO UPDATE SET
        value_encrypted=excluded.value_encrypted,
        updated_at=excluded.updated_at
    `).run(name, valueEncrypted, now, now);
    callback(null);
  } catch (e) {
    callback(e);
  }
}

function deleteSecret(name, callback) {
  try {
    db.prepare("DELETE FROM secrets WHERE name=?").run(name);
    callback(null);
  } catch (e) {
    callback(e);
  }
}

// ==============================================================
// EXPORTS
// ==============================================================

export {
  db,
  listSettings,
  getSetting,
  upsertSetting,
  deleteSetting,
  getPaapiConfig,
  upsertPaapiConfig,
  deletePaapiConfig,
  logEvent,
  listLogs,
  deleteLog,
  listSecrets,
  getSecret,
  upsertSecret,
  deleteSecret
};