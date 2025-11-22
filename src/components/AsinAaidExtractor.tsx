import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface AsinAaidPair {
  asin: string;
  aaid: string;
}

const AsinAaidExtractor: React.FC = () => {
  const [inputHtml, setInputHtml] = React.useState('');
  const [pairs, setPairs] = React.useState<AsinAaidPair[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error'>('success');
  const [isExtracting, setIsExtracting] = React.useState(false);

  const hasResults = pairs.length > 0;

  const aaidMappingText = React.useMemo(
    () => pairs.map(p => `${p.asin}: ${p.aaid}`).join('\n'),
    [pairs]
  );

  const asinListText = React.useMemo(
    () => pairs.map(p => p.asin).join(','),
    [pairs]
  );

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
  };

  const handleExtract = () => {
    setError(null);
    setPairs([]);

    const trimmed = inputHtml.trim();
    if (!trimmed) {
      setError('Please paste the HTML source (containing the ASIN/ID buttons) before extracting.');
      return;
    }

    setIsExtracting(true);

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');

      const collectedPairs: AsinAaidPair[] = [];

      // Primary strategy: work per product tile container for robust mapping
      const tileSelectors = ['.product_tile_editorbar', '.product-tile-editorbar', '.product_tile'];
      let tiles: Element[] = [];

      tileSelectors.forEach(sel => {
        tiles = tiles.concat(Array.from(doc.querySelectorAll(sel)));
      });

      const uniqueTiles = Array.from(new Set(tiles));

      uniqueTiles.forEach(tile => {
        const asinBtn = tile.querySelector<HTMLButtonElement>('button[data-prefix="ASIN"]');
        const idBtn = tile.querySelector<HTMLButtonElement>('button[data-prefix="ID"]');

        const asin = asinBtn?.value?.trim();
        const aaid = idBtn?.value?.trim();

        if (asin && aaid) {
          collectedPairs.push({ asin, aaid });
        }
      });

      // Fallback: pair globally by index if no tiles detected
      if (collectedPairs.length === 0) {
        const asinButtons = Array.from(
          doc.querySelectorAll<HTMLButtonElement>('button[data-prefix="ASIN"]')
        );
        const idButtons = Array.from(
          doc.querySelectorAll<HTMLButtonElement>('button[data-prefix="ID"]')
        );

        const length = Math.min(asinButtons.length, idButtons.length);

        for (let i = 0; i < length; i += 1) {
          const asin = asinButtons[i].value.trim();
          const aaid = idButtons[i].value.trim();

          if (asin && aaid) {
            collectedPairs.push({ asin, aaid });
          }
        }
      }

      if (collectedPairs.length === 0) {
        setError(
          'No ASIN/ID pairs were found. Make sure the HTML contains buttons like ' +
          '\"<button class=\\"input tocopy\\" value=\\"B08...\\" data-prefix=\\"ASIN\\">\" ' +
          'and matching \"data-prefix=\\"ID\\"\" buttons.'
        );
        showSnackbar('No ASIN/ID pairs found in the provided HTML.', 'error');
      } else {
        
      // Dedupe
      const uniqueMap = new Map();
      collectedPairs.forEach(p=> uniqueMap.set(p.asin, p));
      const finalPairs = Array.from(uniqueMap.values());
      setPairs(finalPairs);

        showSnackbar(`Extracted ${collectedPairs.length} ASIN/AAID pairs.`);
      }
    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred while parsing the HTML.');
      showSnackbar('Failed to parse HTML.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSnackbar(`${label} copied to clipboard.`);
    } catch {
      showSnackbar(`Failed to copy ${label}.`, 'error');
    }
  };

  const downloadAsFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCloseSnackbar = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarMessage(null);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              title="1. Paste HTML source"
              subheader="Drop in the HTML chunk that contains the ASIN and ID buttons from your SELJI product editor."
            />
            <CardContent>
              <TextField
                label="HTML input"
                placeholder="<div class=&quot;product_tile_editorbar&quot;>..."
                multiline
                minRows={12}
                maxRows={24}
                fullWidth
                value={inputHtml}
                onChange={(e) => setInputHtml(e.target.value)}
                variant="outlined"
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleExtract}
                  disabled={isExtracting}
                  startIcon={<AssessmentIcon />}
                >
                  {isExtracting ? 'Extracting…' : 'Extract ASIN & AAID'}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ alignSelf: 'center' }}
                >
                  This logic expects buttons with <code>data-prefix=&quot;ASIN&quot;</code> and{' '}
                  <code>data-prefix=&quot;ID&quot;</code>.
                </Typography>
              </Box>
              {error && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="error" variant="outlined">
                    {error}
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ mb: 3 }}>
            <CardHeader
              title="2. AAID mapping output"
              subheader="Format: ASIN=AAID (one per line) — this is your aaid.txt payload."
              action={
                hasResults && (
                  <Typography variant="body2" color="text.secondary">
                    {pairs.length} pairs
                  </Typography>
                )
              }
            />
            <CardContent>
              <TextField
                label="aaid.txt"
                multiline
                minRows={6}
                maxRows={12}
                fullWidth
                value={aaidMappingText}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy AAID mapping">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(aaidMappingText, 'AAID mapping')}
                            disabled={!hasResults}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Download aaid.txt">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => downloadAsFile('aaid.txt', aaidMappingText)}
                            disabled={!hasResults}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
            </CardContent>
          </Card>

          <Card elevation={3}>
            <CardHeader
              title="3. ASIN-only output"
              subheader="Comma-separated ASIN list — this is your asin.txt payload."
            />
            <CardContent>
              <TextField
                label="asin.txt"
                multiline
                minRows={4}
                maxRows={10}
                fullWidth
                value={asinListText}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy ASIN list">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(asinListText, 'ASIN list')}
                            disabled={!hasResults}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Download asin.txt">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => downloadAsFile('asin.txt', asinListText)}
                            disabled={!hasResults}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  ASINs detected: {pairs.length}
                </Typography>
                {hasResults && (
                  <Typography variant="caption" color="text.secondary">
                    First ASIN: <strong>{pairs[0].asin}</strong>
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Design notes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This module is intentionally self-contained and stateless beyond its own UI. It can be
          lifted into a broader SELJI workflow orchestration layer or wrapped by higher-order
          components without refactoring the core extraction logic.
        </Typography>
      </Box>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AsinAaidExtractor;