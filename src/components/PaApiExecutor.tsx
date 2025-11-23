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
  Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [partnerTag, setPartnerTag] = useState('');
  const [marketplace, setMarketplace] = useState(DEFAULT_MARKETPLACE);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [host, setHost] = useState(DEFAULT_HOST);

  const [asins, setAsins] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const closeSnack = () => setSnack({ ...snack, open: false });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config/paapi`);
        if (!res.ok) return;
        const data: PaapiConfig | null = await res.json();
        if (data) {
          setAccessKey(data.accessKey ?? '');
          setSecretKey(data.secretKey ?? '');
          setPartnerTag(data.partnerTag ?? '');
          setMarketplace(data.marketplace || DEFAULT_MARKETPLACE);
          setRegion(data.region || DEFAULT_REGION);
          setHost(data.host || DEFAULT_HOST);
        }
      } catch {
        // ignore UI-side
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/config/paapi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKey: accessKey.trim(),
          secretKey: secretKey.trim(),
          partnerTag: partnerTag.trim(),
          marketplace: marketplace.trim() || DEFAULT_MARKETPLACE,
          region: region.trim() || DEFAULT_REGION,
          host: host.trim() || DEFAULT_HOST
        })
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(j?.error || 'Failed to save config');
      }
      show('PA API config saved');
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      show(e.message || 'Failed to save', 'error');
    }
  };

  const execute = async () => {
    setError(null);
    setResponse(null);

    const asinList = asins
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
        body: JSON.stringify({ asins: asinList })
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || 'Request failed');
      }

      setResponse(json);
      show('PA API request successful');
    } catch (e: any) {
      setError(e.message || 'Failed to execute');
      show(e.message || 'Failed to execute', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    show('Response copied');
  };

  return (
    <Box>
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardHeader
          title="PA API Executor"
          subheader="Configure credentials and connection for Amazon Product Advertising API, then run GetItems."
        />
        <Divider />
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Credentials
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
            <TextField
              label="Access Key"
              fullWidth
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
            <TextField
              label="Secret Key"
              fullWidth
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            PA API Settings
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
            <TextField
              label="Partner Tag (Associate Tag)"
              fullWidth
              value={partnerTag}
              onChange={(e) => setPartnerTag(e.target.value)}
              helperText="Example: selji0c-20"
            />
            <TextField
              label="Marketplace"
              fullWidth
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              helperText={`Default: ${DEFAULT_MARKETPLACE}`}
            />
            <TextField
              label="Region"
              fullWidth
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              helperText={`Default: ${DEFAULT_REGION}`}
            />
            <TextField
              label="Host"
              fullWidth
              value={host}
              onChange={(e) => setHost(e.target.value)}
              helperText={`Default: ${DEFAULT_HOST}`}
            />
          </Box>

          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveConfig}
            sx={{ mb: 3 }}
          >
            Save Config
          </Button>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            ASINs
          </Typography>
          <TextField
            label="ASINs (comma or space separated)"
            fullWidth
            multiline
            minRows={3}
            value={asins}
            onChange={(e) => setAsins(e.target.value)}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={execute}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Execute'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={copyResponse}
              disabled={!response}
            >
              Copy Response
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={3}>
        <CardHeader title="Response" />
        <Divider />
        <CardContent>
          {!response && !loading && (
            <Typography color="text.secondary">
              Execute a PA API request to see the JSON response here.
            </Typography>
          )}
          {response && (
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                maxHeight: 500,
                overflow: 'auto',
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
