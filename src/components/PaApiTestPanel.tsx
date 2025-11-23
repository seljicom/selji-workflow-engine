import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

const PaApiTestPanel: React.FC = () => {
  const [asin, setAsin] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  const [response, setResponse] = useState<any | null>(null);
  const [raw, setRaw] = useState<any | null>(null);

  const [copyState, setCopyState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, msg: '', severity: 'success' });

  const showSnackbar = (msg: string, severity: 'success' | 'error' | 'info' = 'success') =>
    setSnackbar({ open: true, msg, severity });

  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const canTest = asin.trim().length > 0 && !loading;

  const handleTest = async () => {
    setError(null);
    setResponse(null);
    setRaw(null);

    if (!asin.trim()) {
      setError('ASIN is required.');
      return;
    }

    setLoading(true);
    const start = performance.now();

    try {
      const res = await fetch(`${API_BASE}/api/paapi/get-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asins: [asin.trim()] })
      });

      const json = await res.json().catch(() => null);
      const duration = performance.now() - start;

      if (!res.ok) {
        setError(json?.error || 'Request failed.');
        showSnackbar('Live PA API call failed.', 'error');
        setLoading(false);
        return;
      }

      const items = Array.isArray(json.items) ? json.items : [];
      setResponse({
        asin,
        itemCount: items.length,
        durationMs: Math.round(duration),
        item: items[0] || null
      });

      setRaw(json);
      showSnackbar('PA API call successful.', 'success');
    } catch (err) {
      console.error(err);
      setError('Network or server error.');
      showSnackbar('Network/server error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyRaw = async () => {
    if (!raw) return;
    await navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
    setCopyState(true);
    setTimeout(() => setCopyState(false), 1800);
  };

  return (
    <Box>
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardHeader
          title="PA API Live Tester"
          subheader="Test a single ASIN using your backend-connected PA API."
        />
        <CardContent>
          <TextField
            fullWidth
            label="ASIN"
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            margin="normal"
            autoComplete="off"
          />

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleTest}
              disabled={!canTest}
            >
              {loading ? <CircularProgress size={22} /> : 'Test Live PA API'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={3}>
        <CardHeader
          title="Test Result"
          action={
            <IconButton onClick={() => setExpanded(prev => !prev)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          }
        />
        <Collapse in={expanded}>
          <Divider />
          <CardContent>
            {!response && !loading && (
              <Typography variant="body2" color="text.secondary">
                Test results will appear here once you run the PA API call.
              </Typography>
            )}

            {response && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Summary
                </Typography>

                <Typography variant="body2">
                  ASIN: <strong>{response.asin}</strong>
                </Typography>
                <Typography variant="body2">
                  Items Returned: <strong>{response.itemCount}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Duration: <strong>{response.durationMs} ms</strong>
                </Typography>

                {response.item && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Item Title:</Typography>
                    <Typography variant="body1">
                      {response.item.ItemInfo?.Title?.DisplayValue || '—'}
                    </Typography>
                  </Box>
                )}

                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Raw JSON
                </Typography>

                <pre
                  style={{
                    background: '#f4f4f4',
                    padding: '16px',
                    borderRadius: '8px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontSize: '13px'
                  }}
                >
{JSON.stringify(raw, null, 2)}
                </pre>

                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={copyRaw}
                  sx={{ mt: 2 }}
                >
                  {copyState ? 'Copied!' : 'Copy Raw JSON'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Collapse>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2800}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaApiTestPanel;
