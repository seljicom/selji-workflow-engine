import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function expandShortAmazonUrl(url) {
  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    // node-fetch exposes the final redirected URL here:
    const finalUrl = resp.url;

    return finalUrl;
  } catch (err) {
    console.error('Expand error:', err);
    return url; // fail gracefully
  }
};

const extractAsin = (finalUrl) => {
  if (!finalUrl) return null;

  const patterns = [
    /\/dp\/([A-Z0-9]{10})(?=[/?]|$|\?)/i,
    /\/gp\/product\/([A-Z0-9]{10})(?=[/?]|$|\?)/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})(?=[/?]|$|\?)/i
  ];

  for (const p of patterns) {
    const m = finalUrl.match(p);
    if (m && m[1]) return m[1].toUpperCase();
  }

  // fallback
  const g = finalUrl.match(/\/([A-Z0-9]{10})(?=[/?]|$|\?)/i);
  return g?.[1]?.toUpperCase() || null;
};

const expandSingleUrl = async (url) => {
  const finalUrl = await expandShortAmazonUrl(url);
  const asin = extractAsin(finalUrl);

  return {
    url,
    finalUrl,
    asin,
    error: asin ? null : 'ASIN not found'
  };
};

router.post('/expand-amazon-urls', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }

    const results = [];
    for (const u of urls) {
      try {
        const r = await expandSingleUrl(u);
        results.push(r);
      } catch (err) {
        results.push({
          url: u,
          finalUrl: null,
          asin: null,
          error: err.message || 'Expansion failed'
        });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('Error expanding URLs:', err);
    res.status(500).json({ error: 'Server failed expanding URLs' });
  }
});

export default router;