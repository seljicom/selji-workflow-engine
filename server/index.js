import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
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
} from './db.js';

import amazonRoutes from './routes/amazon.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/api', amazonRoutes);

// ---------- Request logger ----------
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- Promisified wrappers ----------
const listSettingsAsync = (section) =>
  new Promise((resolve, reject) => {
    listSettings(section, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const getSettingAsync = (section, name) =>
  new Promise((resolve, reject) => {
    getSetting(section, name, (err, row) => (err ? reject(err) : resolve(row || null)));
  });

const upsertSettingAsync = (section, name, value) =>
  new Promise((resolve, reject) => {
    upsertSetting(section, name, value, (err) => (err ? reject(err) : resolve()));
  });

const deleteSettingAsync = (section, name) =>
  new Promise((resolve, reject) => {
    deleteSetting(section, name, (err) => (err ? reject(err) : resolve()));
  });

const getPaapiConfigAsync = () =>
  new Promise((resolve, reject) => {
    getPaapiConfig((err, cfg) => (err ? reject(err) : resolve(cfg || null)));
  });

const upsertPaapiConfigAsync = (cfg) =>
  new Promise((resolve, reject) => {
    upsertPaapiConfig(cfg, (err) => (err ? reject(err) : resolve()));
  });

const deletePaapiConfigAsync = () =>
  new Promise((resolve, reject) => {
    deletePaapiConfig((err) => (err ? reject(err) : resolve()));
  });

const logEventAsync = (level, message, context) =>
  new Promise((resolve, reject) => {
    logEvent(level, message, context, (err, id) => (err ? reject(err) : resolve(id)));
  });

const listLogsAsync = (opts) =>
  new Promise((resolve, reject) => {
    listLogs(opts, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const deleteLogAsync = (id) =>
  new Promise((resolve, reject) => {
    deleteLog(id, (err) => (err ? reject(err) : resolve()));
  });

const listSecretsAsync = () =>
  new Promise((resolve, reject) => {
    listSecrets((err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const getSecretAsync = (name) =>
  new Promise((resolve, reject) => {
    getSecret(name, (err, row) => (err ? reject(err) : resolve(row || null)));
  });

const upsertSecretAsync = (name, valueEncrypted) =>
  new Promise((resolve, reject) => {
    upsertSecret(name, valueEncrypted, (err) => (err ? reject(err) : resolve()));
  });

const deleteSecretAsync = (name) =>
  new Promise((resolve, reject) => {
    deleteSecret(name, (err) => (err ? reject(err) : resolve()));
  });

// ---------- System health ----------
app.get('/api/system/health', async (req, res) => {
  const startedAt = process.env.APP_STARTED_AT || new Date().toISOString();
  const dbPath = process.env.EXTERNAL_DB_PATH || 'internal: ./server/data/workflow.db';

  try {
    const row = db.prepare('SELECT 1 AS ok').get();
    const ok = row && row.ok === 1;
    res.json({
      status: ok ? 'ok' : 'degraded',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { ok, path: dbPath },
      startedAt
    });
  } catch (err) {
    console.error('Health check DB error:', err);
    res.json({
      status: 'degraded',
      error: String(err),
      db: { ok: false, path: dbPath },
      startedAt
    });
  }
});

// ---------- DB info ----------
app.get('/api/system/db-info', (req, res) => {
  res.json({
    usingExternal: !!process.env.EXTERNAL_DB_PATH,
    dbPath: process.env.EXTERNAL_DB_PATH || 'internal: ./server/data/workflow.db',
    timestamp: new Date().toISOString()
  });
});

// ---------- Settings API ----------
app.get('/api/settings', async (req, res) => {
  try {
    const section = req.query.section || null;
    const rows = await listSettingsAsync(section);
    res.json(rows);
  } catch (err) {
    console.error('DB error (listSettings):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/settings/:section/:name', async (req, res) => {
  const { section, name } = req.params;
  try {
    const row = await getSettingAsync(section, name);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('DB error (getSetting):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/settings/:section/:name', async (req, res) => {
  const { section, name } = req.params;
  const { value } = req.body || {};
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a string' });
  }
  if (!value.trim()) {
    return res.status(400).json({ error: 'value cannot be empty' });
  }
  try {
    await upsertSettingAsync(section, name, value.trim());
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DB error (upsertSetting):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/settings/:section/:name', async (req, res) => {
  const { section, name } = req.params;
  try {
    await deleteSettingAsync(section, name);
    res.status(204).send();
  } catch (err) {
    console.error('DB error (deleteSetting):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------- PAAPI config ----------
app.get('/api/config/paapi', async (req, res) => {
  try {
    const cfg = await getPaapiConfigAsync();
    if (!cfg) return res.json(null);

    res.json({
      accessKey: cfg.accessKey || '',
      secretKey: cfg.secretKey || '',
      partnerTag: cfg.partnerTag || '',
      marketplace: cfg.marketplace || 'www.amazon.com',
      region: cfg.region || 'us-east-1',
      host: cfg.host || 'webservices.amazon.com',
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt
    });
  } catch (err) {
    console.error('DB error (getPaapiConfig):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/config/paapi', async (req, res) => {
  const { accessKey, secretKey, partnerTag, marketplace, region, host } = req.body || {};

  if (typeof accessKey !== 'string' || typeof secretKey !== 'string') {
    return res.status(400).json({ error: 'accessKey and secretKey must be strings' });
  }

  const cfg = {
    accessKey: accessKey.trim(),
    secretKey: secretKey.trim(),
    partnerTag: (partnerTag || '').trim(),
    marketplace: (marketplace || '').trim(),
    region: (region || '').trim(),
    host: (host || '').trim()
  };

  try {
    await upsertPaapiConfigAsync(cfg);
    res.json({ ok: true });
  } catch (err) {
    console.error('DB error (upsertPaapiConfig):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/config/paapi', async (req, res) => {
  try {
    await deletePaapiConfigAsync();
    res.status(204).send();
  } catch (err) {
    console.error('DB error (deletePaapiConfig):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------- Logs API ----------
app.get('/api/logs', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const level = req.query.level || null;
  try {
    const rows = await listLogsAsync({ limit, level });
    res.json(rows);
  } catch (err) {
    console.error('DB error (listLogs):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/logs', async (req, res) => {
  const { level = 'info', message, context } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    const id = await logEventAsync(level, message, context);
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error('DB error (logEvent):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/logs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await deleteLogAsync(id);
    res.status(204).send();
  } catch (err) {
    console.error('DB error (deleteLog):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------- Secrets (AES-256-GCM) ----------
const SECRET_KEY = process.env.SECRET_ENC_KEY || null;

function getAesKey() {
  if (!SECRET_KEY || SECRET_KEY.length < 32) return null;
  return Buffer.from(SECRET_KEY.slice(0, 32), 'utf8');
}

function encryptSecret(plaintext) {
  const key = getAesKey();
  if (!key) throw new Error('SECRET_ENC_KEY not set or too short (>=32 chars required)');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${enc.toString('base64')}:${tag.toString('base64')}`;
}

function decryptSecret(serialized) {
  const key = getAesKey();
  if (!key) throw new Error('SECRET_ENC_KEY not set or too short (>=32 chars required)');
  const [ivB64, encB64, tagB64] = serialized.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

// List secrets
app.get('/api/secrets', async (req, res) => {
  const includeValues = req.query.includeValues === '1';
  try {
    const rows = await listSecretsAsync();
    const mapped = rows.map((r) => {
      const base = {
        id: r.id,
        name: r.name,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
      if (includeValues) {
        try {
          base.value = decryptSecret(r.value_encrypted);
        } catch {
          base.value = null;
        }
      }
      return base;
    });
    res.json(mapped);
  } catch (err) {
    console.error('DB error (listSecrets):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single secret
app.get('/api/secrets/:name', async (req, res) => {
  const { name } = req.params;
  const includeValue = req.query.includeValue === '1';
  try {
    const row = await getSecretAsync(name);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const base = {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    if (includeValue) {
      try {
        base.value = decryptSecret(row.value_encrypted);
      } catch {
        base.value = null;
      }
    }

    res.json(base);
  } catch (err) {
    console.error('DB error (getSecret):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Upsert secret
app.put('/api/secrets/:name', async (req, res) => {
  const { name } = req.params;
  const { value } = req.body || {};

  if (!value || typeof value !== 'string') {
    return res.status(400).json({ error: 'value is required' });
  }

  try {
    const enc = encryptSecret(value.trim());
    await upsertSecretAsync(name, enc);
    res.json({ ok: true });
  } catch (e) {
    console.error('Encryption/DB error (upsertSecret):', e);
    res.status(500).json({ error: 'Encryption or database error' });
  }
});

// Delete secret
app.delete('/api/secrets/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await deleteSecretAsync(name);
    res.status(204).send();
  } catch (err) {
    console.error('DB error (deleteSecret):', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------- PAAPI signing helper ----------
function signPaapiRequest({ accessKey, secretKey, region, host, path, body }) {
  const service = 'ProductAdvertisingAPI';
  const method = 'POST';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payload = JSON.stringify(body);
  const payloadHash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');

  const canonicalHeaders =
    'content-encoding:amz-1.0\n' +
    'content-type:application/json; charset=utf-8\n' +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    'x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n';

  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    method,
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
  ].join('\n');

  const kDate = crypto.createHmac('sha256', 'AWS4' + secretKey).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader =
    `${algorithm} Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorizationHeader, amzDate, payload };
}

// ---------- PAAPI GetItems ----------
app.post('/api/paapi/get-items', async (req, res) => {
  const { asins } = req.body || {};
  if (!Array.isArray(asins) || !asins.length) {
    return res.status(400).json({ error: 'asins must be a non-empty array' });
  }

  try {
    const cfg = await getPaapiConfigAsync();
    if (!cfg || !cfg.accessKey || !cfg.secretKey) {
      return res.status(400).json({ error: 'PA API not configured' });
    }

    const partnerTag = cfg.partnerTag.trim();
    if (!partnerTag) {
      return res.status(400).json({ error: 'partnerTag not configured' });
    }

    const marketplace = cfg.marketplace || 'www.amazon.com';
    const region = cfg.region || 'us-east-1';
    const host = cfg.host || 'webservices.amazon.com';
    const path = '/paapi5/getitems';

    const body = {
      ItemIds: asins,
      Resources: [
        'CustomerReviews.Count',
        'CustomerReviews.StarRating',
        'ItemInfo.ByLineInfo',
        'ItemInfo.ContentInfo',
        'ItemInfo.ContentRating',
        'ItemInfo.Classifications',
        'ItemInfo.ExternalIds',
        'ItemInfo.Features',
        'ItemInfo.ManufactureInfo',
        'ItemInfo.ProductInfo',
        'ItemInfo.TechnicalInfo',
        'ItemInfo.Title',
        'ItemInfo.TradeInInfo'
      ],
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: marketplace
    };

    const { authorizationHeader, amzDate, payload } = signPaapiRequest({
      accessKey: cfg.accessKey,
      secretKey: cfg.secretKey,
      region,
      host,
      path,
      body
    });

    const url = `https://${host}${path}`;
    const fetchFn = global.fetch ?? (await import('node-fetch')).default;

    const resp = await fetchFn(url, {
      method: 'POST',
      headers: {
        'content-encoding': 'amz-1.0',
        'content-type': 'application/json; charset=utf-8',
        host,
        'x-amz-date': amzDate,
        'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
        Authorization: authorizationHeader
      },
      body: payload
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: data || 'PA API error',
        statusCode: resp.status
      });
    }

    const items = (data.ItemsResult && data.ItemsResult.Items) || data.Items || [];
    res.json({ items });
  } catch (e) {
    console.error('PA API request failed:', e);
    res.status(500).json({ error: 'PA API request failed' });
  }
});

// ---------- Start server ----------
app.listen(PORT, () => {
  process.env.APP_STARTED_AT = new Date().toISOString();
  console.log(`SELJI Workflow Engine API listening on port ${PORT}`);
});