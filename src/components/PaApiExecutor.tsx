import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  TextField,
  Typography,
  Collapse,
  IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useWorkflowStore } from '../store/workflowStore';

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

interface PaapiConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string;
  region: string;
  host: string;
}

const DEFAULT_MARKETPLACE = 'www.amazon.com';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_HOST = 'webservices.amazon.com';

const PaApiExecutor: React.FC = () => {
  // Zustand-backed fields
  const accessKey = useWorkflowStore((s) => s.paapi.accessKey);
  const secretKey = useWorkflowStore((s) => s.paapi.secretKey);
  const partnerTag = useWorkflowStore((s) => s.paapi.partnerTag);
  const marketplace = useWorkflowStore((s) => s.paapi.marketplace);
  const region = useWorkflowStore((s) => s.paapi.region);
  const host = useWorkflowStore((s) => s.paapi.host);
  const asins = useWorkflowStore((s) => s.paapi.asins);
  const response = useWorkflowStore((s) => s.paapi.response);
  const error = useWorkflowStore((s) => s.paapi.error);
  const setPaapiField = useWorkflowStore((s) => s.setPaapiField);

  // Local UI state
  const [loading, setLoading] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    msg: '',
    severity: 'success'
  });

  const show = (msg: string, severity: 'success' | 'error' | 'info' = 'success') =>
    setSnack({ open: true, msg, severity });

  const closeSnack = () => setSnack((prev) => ({ ...prev, open: false }));

  // Helpers to route error/response into the global store
  const setError = (value: string | null) => setPaapiField('error', value);
  const setResponse = (value: any | null) => setPaapiField('response', value);

  // Always load config from backend on mount (DB is source of truth)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config/paapi`);
        if (!res.ok) return;

        const data: PaapiConfig | null = await res.json();
        if (data) {
          setPaapiField('accessKey', data.accessKey ?? '');
          setPaapiField('secretKey', data.secretKey ?? '');
          setPaapiField('partnerTag', data.partnerTag ?? '');
          setPaapiField('marketplace', data.marketplace || DEFAULT_MARKETPLACE);
          setPaapiField('region', data.region || DEFAULT_REGION);
          setPaapiField('host', data.host || DEFAULT_HOST);
        }
      } catch {
        // ignore UI-side; user can still type manually
      }
    };

    loadConfig();
  }, [setPaapiField]);

  const saveConfig = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/config/paapi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKey: (accessKey || '').trim(),
          secretKey: (secretKey || '').trim(),
          partnerTag: (partnerTag || '').trim(),
          marketplace: (marketplace || '').trim() || DEFAULT_MARKETPLACE,
          region: (region || '').trim() || DEFAULT_REGION,
          host: (host || '').trim() || DEFAULT_HOST
        })
      });

      const j = await res.json().catch(() => null as any);

      if (!res.ok) {
        show(j?.error || 'Failed to save PA API config', 'error');
        return;
      }

      show('PA API configuration saved');
    } catch (e: any) {
      show(e?.message || 'Failed to save PA API config', 'error');
    }
  };

  const execute = async () => {
    setError(null);
    setResponse(null);

    const asinList = (asins || '')
      .split(/[\s,]+/)
      .map((a) => a.trim())
      .filter(Boolean);

    if (!asinList.length) {
      setError('Please enter at least one ASIN');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/paapi/get-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKey: (accessKey || '').trim(),
          secretKey: (secretKey || '').trim(),
          partnerTag: (partnerTag || '').trim(),
          marketplace: (marketplace || '').trim() || DEFAULT_MARKETPLACE,
          region: (region || '').trim() || DEFAULT_REGION,
          host: (host || '').trim() || DEFAULT_HOST,
          asins: asinList
        })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || 'Request failed');
      }

      setResponse(json);
      show('PA API request successful');
    } catch (e: any) {
      const msg = e?.message || 'Failed to execute';
      setError(msg);
      show(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = async () => {
    if (!response) {
      show('Nothing to copy yet', 'info');
      return;
    }

    try {
      const text = JSON.stringify(response, null, 2);
      await navigator.clipboard.writeText(text);
      show('Response JSON copied');
    } catch {
      show('Failed to copy response', 'error');
    }
  };

  return (
    <Box>
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardHeader
          title="PA API Executor"
          subheader="Execute Amazon Product Advertising API 5.0 calls with your stored credentials."
        />
        <Divider />
        <CardContent>
          {/* Credentials section (collapsible) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: 1,
              mt: 1
            }}
            onClick={() => setCredOpen((o) => !o)}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Credentials
            </Typography>
            <IconButton
              size="small"
              sx={{
                transform: credOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease'
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={credOpen} timeout="auto" unmountOnExit>
            <Box sx={{ display: 'grid', gap: 2, mb: 3, mt: 1 }}>
              <TextField
                label="Access Key"
                fullWidth
                value={accessKey}
                onChange={(e) => setPaapiField('accessKey', e.target.value)}
              />
              <TextField
                label="Secret Key"
                fullWidth
                type="password"
                value={secretKey}
                onChange={(e) => setPaapiField('secretKey', e.target.value)}
              />
              <TextField
                label="Partner Tag (Associate Tag)"
                fullWidth
                value={partnerTag}
                onChange={(e) => setPaapiField('partnerTag', e.target.value)}
                helperText="Example: selji0c-20"
              />
            </Box>
          </Collapse>

          {/* Settings section (collapsible) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: 1,
              mt: 2
            }}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              PA API Settings
            </Typography>
            <IconButton
              size="small"
              sx={{
                transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease'
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
            <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
              <TextField
                label="Marketplace"
                fullWidth
                value={marketplace}
                onChange={(e) => setPaapiField('marketplace', e.target.value)}
                helperText={`Default: ${DEFAULT_MARKETPLACE}`}
              />
              <TextField
                label="Region"
                fullWidth
                value={region}
                onChange={(e) => setPaapiField('region', e.target.value)}
                helperText={`Default: ${DEFAULT_REGION}`}
              />
              <TextField
                label="Host"
                fullWidth
                value={host}
                onChange={(e) => setPaapiField('host', e.target.value)}
                helperText={`Default: ${DEFAULT_HOST}`}
              />
            </Box>
          </Collapse>

          <Divider sx={{ my: 2 }} />

          {/* ASIN input */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            ASINs (comma or space separated)
          </Typography>
          <TextField
            label="ASINs"
            placeholder="B001JZ5PZA, B07XJ8C8F7, ..."
            fullWidth
            multiline
            minRows={3}
            value={asins}
            onChange={(e) => setPaapiField('asins', e.target.value)}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={execute}
              disabled={loading}
            >
              Execute
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={saveConfig}
              disabled={loading}
            >
              Save Config
            </Button>
            {loading && <CircularProgress size={24} />}
          </Box>
        </CardContent>
      </Card>

      <Card elevation={3}>
        <CardHeader
          title="PA API Response"
          action={
            <IconButton onClick={handleCopyResponse} aria-label="Copy response JSON">
              <ContentCopyIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          {!response && (
            <Typography color="text.secondary">
              Execute a request to see the raw PA API response here.
            </Typography>
          )}

          {response && (
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                maxHeight: 400,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 13
              }}
            >
              {JSON.stringify(response, null, 2)}
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

export default PaApiExecutor;