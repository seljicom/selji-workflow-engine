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
  Typography,
  Tooltip,
  Zoom
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';

import { useWorkflowStore } from '../store/workflowStore';

interface UrlResult {
  url: string;
  finalUrl?: string | null;
  asin?: string | null;
  error?: string | null;
}

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

const parseInputToUrls = (raw: string): string[] => {
  if (!raw.trim()) return [];

  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const token of tokens) {
    let value = token.replace(/[;,]+$/, '');
    if (!/^https?:\/\//i.test(value)) {
      if (/^(a\.co|amzn\.to)\//i.test(value)) {
        value = 'https://' + value;
      } else {
        continue;
      }
    }
    if (!seen.has(value)) {
      seen.add(value);
      urls.push(value);
    }
  }

  return urls;
};

const ShortUrlAsinExpander: React.FC = () => {
  // Global persistent state
  const rawInput = useWorkflowStore((s) => s.asinExpander.rawInput);
  const results = useWorkflowStore((s) => s.asinExpander.results as UrlResult[]);
  const setExpanderField = useWorkflowStore((s) => s.setAsinExpanderField);

  // Local UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: ''
  });
  const [copiedAsin, setCopiedAsin] = useState<string | null>(null);

  const urls = parseInputToUrls(rawInput);
  const hasInput = urls.length > 0;

  const uniqueAsins = Array.from(
    new Set(results.filter((r) => r.asin).map((r) => String(r.asin)))
  );
  const asinListString = uniqueAsins.join(', ');

  const clearAll = () => {
    setExpanderField('rawInput', '');
    setExpanderField('results', []);
    setError(null);
    setCopiedAsin(null);
  };

  const showSnack = (msg: string) => setSnack({ open: true, msg });
  const closeSnack = () => setSnack({ open: false, msg: '' });

  const handleExpand = async () => {
    setError(null);
    setExpanderField('results', []);

    const parsedUrls = parseInputToUrls(rawInput);
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
        setExpanderField('results', data.results || []);
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
        const temp = document.createElement('textarea');
        temp.value = asinListString;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      showSnack('ASIN list copied');
    } catch {
      showSnack('Failed to copy');
    }
  };

  const copySingleAsin = async (asin: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(asin);
      } else {
        const temp = document.createElement('textarea');
        temp.value = asin;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }

      setCopiedAsin(asin);
      showSnack(`Copied ASIN: ${asin}`);

      setTimeout(() => setCopiedAsin(null), 800);
    } catch {
      showSnack('Failed to copy');
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
        <Divider />
        <CardContent>
          <TextField
            label="Short Amazon URLs"
            placeholder={`Paste URLs in any of these forms, one or many:
https://a.co/d/8f6NY5T
https://a.co/d/bvDVvGX
https://a.co/d/7hpXKdA

Comma, space, or newline separated are all supported.`}
            multiline
            minRows={5}
            fullWidth
            value={rawInput}
            onChange={(e) => setExpanderField('rawInput', e.target.value)}
            sx={{
              '& .MuiInputBase-inputMultiline': {
                maxHeight: '220px',
                overflowY: 'auto'
              }
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center'
            }}
          >
            <Button
              variant="contained"
              onClick={handleExpand}
              disabled={loading || !hasInput}
            >
              Expand & Extract ASINs
            </Button>
            <Button
              variant="outlined"
              onClick={handleCopyAsins}
              disabled={!uniqueAsins.length}
              startIcon={<ContentCopyIcon />}
            >
              Copy ASIN List
            </Button>

            {loading && (
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress />
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Parsed URLs: <strong>{urls.length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unique ASINs: <strong>{uniqueAsins.length}</strong>
            </Typography>
            {results.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Success: <strong>{successCount}</strong> | Failed:{' '}
                <strong>{failureCount}</strong>
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card elevation={3}>
        <CardHeader
          title="Per-URL Status"
          subheader={
            results.length
              ? 'Review each short URL, its expanded target, and extracted ASIN.'
              : 'Run an expansion to see per-URL details.'
          }
        />
        <Divider />
        <CardContent>
          {results.length === 0 && (
            <Typography color="text.secondary">
              No results yet. Paste some URLs above and click &quot;Expand &amp; Extract
              ASINs&quot;.
            </Typography>
          )}

          {results.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {results.map((r, idx) => (
                <Box
                  key={`${r.url}-${idx}`}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: r.error
                      ? 'rgba(244, 67, 54, 0.03)'
                      : 'rgba(76, 175, 80, 0.02)'
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {r.url}
                  </Typography>
                  {r.finalUrl && r.finalUrl !== r.url && (
                    <Typography variant="body2" color="text.secondary">
                      → {r.finalUrl}
                    </Typography>
                  )}
                  {r.asin && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.2,
                        padding: '4px 6px',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                        backgroundColor:
                          copiedAsin === r.asin
                            ? 'rgba(76, 175, 80, 0.12)'
                            : 'transparent',
                        boxShadow:
                          copiedAsin === r.asin
                            ? '0 0 0 4px rgba(76, 175, 80, 0.15)'
                            : 'none',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.04)'
                        }
                      }}
                    >
                      <Typography variant="body2">
                        ASIN: <strong>{r.asin}</strong>
                      </Typography>

                      <Tooltip title="Copy ASIN" placement="top" TransitionComponent={Zoom}>
                        <IconButton
                          size="small"
                          onClick={() => copySingleAsin(String(r.asin))}
                          aria-label="Copy ASIN"
                          sx={{
                            padding: '3px',
                            borderRadius: '6px',
                            border: '1px solid rgba(0,0,0,0.18)',
                            backgroundColor: '#fff',
                            transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                            transform:
                              copiedAsin === r.asin ? 'scale(1.13)' : 'scale(1.0)',
                            boxShadow:
                              copiedAsin === r.asin
                                ? '0 0 6px rgba(76,175,80,0.45)'
                                : 'none',
                            '&:hover': {
                              transform: 'scale(1.13)',
                              backgroundColor: 'rgba(255,255,255,0.9)'
                            },
                            '&:active': {
                              transform: 'scale(0.97)'
                            }
                          }}
                        >
                          <ContentCopyIcon
                            sx={{
                              fontSize: '15px',
                              color: copiedAsin === r.asin ? 'green' : 'inherit'
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  {r.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {r.error}
                    </Alert>
                  )}
                </Box>
              ))}
            </Box>
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