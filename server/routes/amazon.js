import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
* Robust fetch with:
* - Timeout (ms)
* - Retry attempts
* - Exponential backoff
* - Browser UA spoofing
*/
async function robustFetch(url, { timeout = 6000, retries = 3, backoff = 500 } = {}) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const resp = await fetch(url, {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(id);

            // Successful response → return
            return resp;
        } catch (err) {
            clearTimeout(id);

            const isLast = attempt === retries;

            const isAbort = err.name === 'AbortError';
            const transient =
                isAbort ||
                err.code === 'ECONNRESET' ||
                err.code === 'ENOTFOUND' ||
                err.code === 'ECONNREFUSED';

            if (isLast || !transient) {
                // Final attempt or non-retryable error
                throw err;
            }

            // Retry with exponential backoff
            await new Promise((res) => setTimeout(res, backoff * attempt));
        }
    }

    throw new Error('robustFetch: unexpected fallthrough');
}

async function expandShortAmazonUrl(url) {
    try {
        const resp = await robustFetch(url, {
            timeout: 7000,
            retries: 4,
            backoff: 800
        });

        const finalUrl = resp.url || url;
        return finalUrl;
    } catch (err) {
        console.error(`Failed to expand: ${url}`, err);
        return url; // graceful fallback
    }
};

const extractAsin = (finalUrl) => {
    if (!finalUrl) return null;

    const patterns = [
        /\/dp\/([A-Z0-9]{10})(?=[/?]|$|\?)/i,
        /\/gp\/product\/([A-Z0-9]{10})(?=[/?]|$|\?)/i,
        /\/gp\/aw\/d\/([A-Z0-9]{10})(?=[/?]|$|\?)/i,
        /\/product\/([A-Z0-9]{10})(?=[/?]|$|\?)/i
    ];

    for (const p of patterns) {
        const m = finalUrl.match(p);
        if (m && m[1]) return m[1].toUpperCase();
    }

    const fallback = finalUrl.match(/\/([A-Z0-9]{10})(?=[/?]|$|\?)/i);
    return fallback?.[1]?.toUpperCase() || null;
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

        if (!Array.isArray(urls) || !urls.length) {
            return res.status(400).json({ error: 'No URLs provided' });
        }

        const results = [];
        for (const u of urls) {
            try {
                const r = await expandSingleUrl(u);
                results.push(r);
            } catch (e) {
                results.push({
                    url: u,
                    finalUrl: null,
                    asin: null,
                    error: e.message || 'Expansion failed'
                });
            }
        }

        res.json({ results });
    } catch (err) {
        console.error('Server failure:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;