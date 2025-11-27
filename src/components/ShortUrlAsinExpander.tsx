// NEW FILE: src/components/ShortUrlAsinExpander.tsx

import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Divider,
    IconButton,
    LinearProgress,
    Snackbar,
    TextField,
    Typography
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';

interface UrlResult {
    url: string;
    asin?: string;
    error?: string;
}

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

const parseInputToUrls = (raw: string): string[] => {
    if (!raw.trim()) return [];

    // split on whitespace and commas
    const tokens = raw
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean);

    // basic de-dupe, keep first occurrence order
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const token of tokens) {
        let value = token.replace(/[;,]+$/, ''); // strip trailing punctuation
        if (!/^https?:\/\//i.test(value)) {
            // leave obviously non-URL tokens out rather than auto-prefix
            continue;
        }
        if (!seen.has(value)) {
            seen.add(value);
            urls.push(value);
        }
    }
    return urls;
};

const extractAsinFromUrl = (url: string): string | null => {
    // Try common Amazon URL patterns first
    const specific = url.match(
        /(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/gp\/offer-listing\/)([A-Z0-9]{10})/i
    );
    if (specific?.[1]) return specific[1].toUpperCase();

    // Fallback: any 10-char ASIN-looking segment in path
    const generic = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (generic?.[1]) return generic[1].toUpperCase();

    return null;
};

const expandAndExtractASIN = async (shortUrl: string): Promise<string> => {
    // We intentionally try HEAD first for speed, then fall back to GET
    const attempt = async (method: 'HEAD' | 'GET'): Promise<Response> => {
        const res = await fetch(shortUrl, {
            method,
            redirect: 'follow'
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} for ${method} ${shortUrl}`);
        }
        return res;
    };

    let resp: Response;
    try {
        resp = await attempt('HEAD');
    } catch {
        resp = await attempt('GET');
    }

    // For cross-origin redirects, `response.url` usually reflects the
    // final URL even if CORS prevents reading the body.
    const finalUrl = resp.url || shortUrl;
    const asin = extractAsinFromUrl(finalUrl);
    if (!asin) {
        throw new Error('ASIN not found in expanded URL');
    }
    return asin;
};

const ShortUrlAsinExpander: React.FC = () => {
    const [input, setInput] = useState('');
    const [results, setResults] = useState<UrlResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snack, setSnack] = useState<{ open: boolean; msg: string }>({
        open: false,
        msg: ''
    });

    const urls = parseInputToUrls(input);
    const hasInput = urls.length > 0;

    const uniqueAsins = Array.from(
        new Set(results.filter((r) => r.asin).map((r) => r.asin as string))
    );
    const asinListString = uniqueAsins.join(', ');

    const clearAll = () => {
        setInput('');
        setResults([]);
        setError(null);
    };

    const showSnack = (msg: string) => setSnack({ open: true, msg });
    const closeSnack = () => setSnack({ open: false, msg: '' });

    const handleExpand = async () => {
        setError(null);
        setResults([]);

        const parsedUrls = parseInputToUrls(input);
        if (!parsedUrls.length) {
            setError('Please paste at least one valid short Amazon URL.');
            return;
        }

        setLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/api/expand-amazon-urls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: parsedUrls })
            });

            const data = await resp.json();

            if (!resp.ok) {
                setError(data.error || 'Server error while expanding URLs');
            } else {
                setResults(data.results);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        }
        setLoading(false);
    };

    const handleCopyAsins = async () => {
        if (!asinListString) {
            showSnack('Nothing to copy yet');
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(asinListString);
            } else {
                // Fallback for older browsers
                const temp = document.createElement('textarea');
                temp.value = asinListString;
                temp.style.position = 'fixed';
                temp.style.left = '-9999px';
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
            showSnack('ASIN list copied');
        } catch {
            showSnack('Failed to copy ASIN list');
        }
    };

    const successCount = results.filter((r) => r.asin).length;
    const failureCount = results.filter((r) => r.error).length;

    return (
        <Box>
            <Card elevation={3} sx={{ mb: 3 }}>
                <CardHeader
                    avatar={<LinkIcon color="primary" />}
                    title="Short Amazon URL ASIN Expander"
                    subheader="Paste short Amazon URLs (a.co, amzn.to, etc.) and extract a clean, unique ASIN list."
                    action={
                        <IconButton onClick={clearAll} aria-label="Clear input and results">
                            <DeleteIcon />
                        </IconButton>
                    }
                />
                <CardContent>
                    <TextField
                        label="Short Amazon URLs"
                        placeholder={`Paste URLs in any of these formats:\nhttps://a.co/d/8f6NY5T\nhttps://a.co/d/bvDVvGX\nhttps://a.co/d/7hpXKdA\n\nComma, space, or newline separated are all supported.`}
                        multiline
                        minRows={5}
                        fullWidth
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        sx={{
                            '& .MuiInputBase-inputMultiline': {
                                maxHeight: '220px',
                                overflowY: 'auto'
                            }
                        }}
                    />

                    <Box
                        sx={{
                            mt: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Detected URLs: <strong>{urls.length}</strong>
                        </Typography>
                        {hasInput && (
                            <Typography variant="body2" color="text.secondary">
                                Unique ASINs (after run): <strong>{uniqueAsins.length}</strong>
                            </Typography>
                        )}
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {loading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5 }}
                            >
                                Expanding URLs and extracting ASINs…
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleExpand}
                            disabled={!urls.length || loading}
                        >
                            Expand & Extract ASINs
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={clearAll}
                            disabled={!input.trim() && !results.length}
                        >
                            Reset
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={3}>
                <CardHeader
                    title="ASIN Results"
                    subheader={
                        results.length
                            ? `Processed ${results.length} URL${results.length !== 1 ? 's' : ''} — ` +
                            `${successCount} succeeded, ${failureCount} failed.`
                            : 'Run the expander to see results here.'
                    }
                    action={
                        <IconButton
                            onClick={handleCopyAsins}
                            disabled={!asinListString}
                            aria-label="Copy ASIN list"
                        >
                            <ContentCopyIcon />
                        </IconButton>
                    }
                />
                <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Clean, comma-separated ASIN list
                    </Typography>
                    <Box
                        component="pre"
                        sx={{
                            backgroundColor: '#f5f5f5',
                            p: 2,
                            borderRadius: 1,
                            maxHeight: 200,
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: 13
                        }}
                    >
                        {asinListString || 'No ASINs yet.'}
                    </Box>

                    {results.length > 0 && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Per-URL status
                            </Typography>
                            <Box
                                sx={{
                                    maxHeight: 260,
                                    overflow: 'auto',
                                    borderRadius: 1,
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    p: 1
                                }}
                            >
                                {results.map((r) => (
                                    <Box
                                        key={r.url}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            mb: 1.5,
                                            p: 1,
                                            borderRadius: 1,
                                            backgroundColor: r.error ? '#fff5f5' : '#f5fff7'
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                wordBreak: 'break-all',
                                                color: 'text.secondary',
                                                mb: 0.5
                                            }}
                                        >
                                            {r.url}
                                        </Typography>
                                        {r.asin && (
                                            <Typography variant="body2">
                                                ASIN: <strong>{r.asin}</strong>
                                            </Typography>
                                        )}
                                        {r.error && (
                                            <Typography variant="body2" color="error">
                                                {r.error}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snack.open}
                autoHideDuration={2500}
                onClose={closeSnack}
                message={snack.msg}
            />
        </Box>
    );
};

export default ShortUrlAsinExpander;