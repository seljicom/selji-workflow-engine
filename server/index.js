const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const {
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
} = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * -------- System Health ----------
 */
app.get('/api/system/health', (req, res) => {
  const startedAt = process.env.APP_STARTED_AT || new Date().toISOString();
  db.get('SELECT 1 AS ok', [], (err, row) => {
    const dbOk = !err && row && row.ok === 1;
    const status = dbOk ? 'ok' : 'degraded';
    if (err) {
      console.error('Healthcheck DB error:', err);
    }
    res.json({
      status,
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { ok: dbOk },
      startedAt
    });
  });
});

/**
 * -------- Generic Settings CRUD ----------
 */
app.get('/api/settings', (req, res) => {
  const { section } = req.query;
  listSettings(section || null, (err, rows) => {
    if (err) {
      console.error('DB error (listSettings):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

app.get('/api/settings/:section/:name', (req, res) => {
  const { section, name } = req.params;
  getSetting(section, name, (err, row) => {
    if (err) {
      console.error('DB error (getSetting):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

app.put('/api/settings/:section/:name', (req, res) => {
  const { section, name } = req.params;
  const { value } = req.body || {};
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a string' });
  }
  if (!value.trim()) {
    return res.status(400).json({ error: 'value cannot be empty' });
  }
  upsertSetting(section, name, value.trim(), (err) => {
    if (err) {
      console.error('DB error (upsertSetting):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(200).json({ ok: true });
  });
});

app.delete('/api/settings/:section/:name', (req, res) => {
  const { section, name } = req.params;
  deleteSetting(section, name, (err) => {
    if (err) {
      console.error('DB error (deleteSetting):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(204).send();
  });
});

/**
 * -------- PA API Config ----------
 * Now DB-backed:
 *  accessKey, secretKey, partnerTag, marketplace, region, host
 */
app.get('/api/config/paapi', (req, res) => {
  getPaapiConfig((err, cfg) => {
    if (err) {
      console.error('DB error (getPaapiConfig):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!cfg) return res.json(null);

    const marketplaceDefault = 'www.amazon.com';
    const regionDefault = 'us-east-1';
    const hostDefault = 'webservices.amazon.com';

    res.json({
      accessKey: cfg.accessKey || '',
      secretKey: cfg.secretKey || '',
      partnerTag: cfg.partnerTag || '',
      marketplace: cfg.marketplace || marketplaceDefault,
      region: cfg.region || regionDefault,
      host: cfg.host || hostDefault,
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt
    });
  });
});

app.put('/api/config/paapi', (req, res) => {
  const {
    accessKey,
    secretKey,
    partnerTag,
    marketplace,
    region,
    host
  } = req.body || {};

  if (typeof accessKey !== 'string' || typeof secretKey !== 'string') {
    return res.status(400).json({ error: 'accessKey and secretKey must be strings' });
  }

  const a = accessKey.trim();
  const s = secretKey.trim();
  if (!a || !s) {
    return res.status(400).json({ error: 'Both accessKey and secretKey are required' });
  }
  if (a.length > 200 || s.length > 200) {
    return res.status(400).json({ error: 'Keys too long' });
  }

  const config = {
    accessKey: a,
    secretKey: s,
    partnerTag: (partnerTag || '').trim(),
    marketplace: (marketplace || '').trim(),
    region: (region || '').trim(),
    host: (host || '').trim()
  };

  upsertPaapiConfig(config, (err) => {
    if (err) {
      console.error('DB error (upsertPaapiConfig):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ ok: true });
  });
});

app.delete('/api/config/paapi', (req, res) => {
  deletePaapiConfig((err) => {
    if (err) {
      console.error('DB error (deletePaapiConfig):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(204).send();
  });
});

/**
 * -------- Logs ----------
 */
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const level = req.query.level || null;
  listLogs({ limit, level }, (err, rows) => {
    if (err) {
      console.error('DB error (listLogs):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

app.post('/api/logs', (req, res) => {
  const { level = 'info', message, context } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  const lvl = String(level || 'info').toLowerCase();
  logEvent(lvl, message.trim(), context || null, (err, id) => {
    if (err) {
      console.error('DB error (logEvent):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ ok: true, id });
  });
});

app.delete('/api/logs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  deleteLog(id, (err) => {
    if (err) {
      console.error('DB error (deleteLog):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(204).send();
  });
});

/**
 * -------- Secrets (AES-256-GCM) ----------
 * Requires env SECRET_ENC_KEY (32+ chars)
 */

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
  return [
    iv.toString('base64'),
    enc.toString('base64'),
    tag.toString('base64')
  ].join(':');
}

function decryptSecret(serialized) {
  const key = getAesKey();
  if (!key) throw new Error('SECRET_ENC_KEY not set or too short (>=32 chars required)');
  const [ivB64, encB64, tagB64] = String(serialized).split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

app.get('/api/secrets', (req, res) => {
  const includeValues = req.query.includeValues === '1';
  listSecrets((err, rows) => {
    if (err) {
      console.error('DB error (listSecrets):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const mapped = (rows || []).map((r) => {
      const base = {
        id: r.id,
        name: r.name,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
      if (includeValues) {
        try {
          base.value = decryptSecret(r.value_encrypted);
        } catch (e) {
          base.value = null;
        }
      }
      return base;
    });
    res.json(mapped);
  });
});

app.get('/api/secrets/:name', (req, res) => {
  const { name } = req.params;
  const includeValue = req.query.includeValue === '1';
  getSecret(name, (err, row) => {
    if (err) {
      console.error('DB error (getSecret):', err);
      return res.status(500).json({ error: 'Database error' });
    }
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
      } catch (e) {
        base.value = null;
      }
    }
    res.json(base);
  });
});

app.put('/api/secrets/:name', (req, res) => {
  const { name } = req.params;
  const { value } = req.body || {};
  if (typeof value !== 'string' || !value.trim()) {
    return res.status(400).json({ error: 'value is required' });
  }
  try {
    const encrypted = encryptSecret(value.trim());
    upsertSecret(name, encrypted, (err) => {
      if (err) {
        console.error('DB error (upsertSecret):', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ ok: true });
    });
  } catch (e) {
    console.error('Secret encryption error:', e);
    res.status(500).json({ error: 'Encryption not configured properly' });
  }
});

app.delete('/api/secrets/:name', (req, res) => {
  const { name } = req.params;
  deleteSecret(name, (err) => {
    if (err) {
      console.error('DB error (deleteSecret):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(204).send();
  });
});

/**
 * -------- PA API GetItems ----------
 * Uses SigV4 signing. All config comes from DB via getPaapiConfig():
 *  - accessKey
 *  - secretKey
 *  - partnerTag
 *  - marketplace (default www.amazon.com)
 *  - region (default us-east-1)
 *  - host (default webservices.amazon.com)
 */

function signPaapiRequest({ accessKey, secretKey, region, host, path, body }) {
  const service = 'ProductAdvertisingAPI';
  const method = 'POST';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8); // YYYYMMDD

  const canonicalUri = path;
  const canonicalQueryString = '';

  const payload = JSON.stringify(body);
  const payloadHash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');

  const canonicalHeaders =
    'content-encoding:amz-1.0\n' +
    'content-type:application/json; charset=utf-8\n' +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    'x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n';

  const signedHeaders =
    'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
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

  const kDate = crypto
    .createHmac('sha256', 'AWS4' + secretKey)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');

  const authorizationHeader =
    `${algorithm} Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorizationHeader, amzDate, payload };
}

app.post('/api/paapi/get-items', async (req, res) => {
  const { asins } = req.body || {};
  if (!Array.isArray(asins) || asins.length === 0) {
    return res.status(400).json({ error: 'asins must be a non-empty array' });
  }

  getPaapiConfig(async (err, cfg) => {
    if (err) {
      console.error('DB error (getPaapiConfig):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!cfg || !cfg.accessKey || !cfg.secretKey) {
      return res.status(400).json({ error: 'PA API credentials not configured' });
    }

    const partnerTag = (cfg.partnerTag || '').trim();
    if (!partnerTag) {
      return res.status(400).json({ error: 'PA API partnerTag not configured' });
    }

    const marketplaceDefault = 'www.amazon.com';
    const regionDefault = 'us-east-1';
    const hostDefault = 'webservices.amazon.com';

    const marketplace = (cfg.marketplace || marketplaceDefault).trim() || marketplaceDefault;
    const region = (cfg.region || regionDefault).trim() || regionDefault;
    const host = (cfg.host || hostDefault).trim() || hostDefault;
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

    try {
      const { authorizationHeader, amzDate, payload } = signPaapiRequest({
        accessKey: cfg.accessKey,
        secretKey: cfg.secretKey,
        region,
        host,
        path,
        body
      });

      const url = `https://${host}${path}`;
      const fetchFn = global.fetch || require('node-fetch');

      const resp = await fetchFn(url, {
        method: 'POST',
        headers: {
          'content-encoding': 'amz-1.0',
          'content-type': 'application/json; charset=utf-8',
          host,
          'x-amz-date': amzDate,
          'x-amz-target':
            'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
          Authorization: authorizationHeader
        },
        body: payload
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error('PA API error:', data);
        return res.status(resp.status).json({
          error: data || 'PA API error',
          statusCode: resp.status
        });
      }

      const items =
        (data.ItemsResult && data.ItemsResult.Items) ||
        data.Items ||
        [];

      res.json({ items });
    } catch (e) {
      console.error('PA API request failed:', e);
      res.status(500).json({ error: 'PA API request failed' });
    }
  });
});

app.listen(PORT, () => {
  process.env.APP_STARTED_AT = new Date().toISOString();
  console.log(`SELJI Workflow Engine API (v4) listening on port ${PORT}`);
});
