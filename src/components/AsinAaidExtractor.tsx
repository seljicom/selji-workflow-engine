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
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Mapping {
  asin: string;
  aaid: string;
}

const AsinAaidExtractor: React.FC = () => {
  const [input, setInput] = useState('');
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: ''
  });

  const showSnack = (msg: string) => setSnack({ open: true, msg });
  const closeSnack = () => setSnack({ open: false, msg: '' });

  const parseHtml = () => {
    try {
      setError(null);
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/html');

      const asinButtons = Array.from(
        doc.querySelectorAll<HTMLButtonElement>('button.input.tocopy[data-prefix="ASIN"]')
      );
      const idButtons = Array.from(
        doc.querySelectorAll<HTMLButtonElement>('button.input.tocopy[data-prefix="ID"]')
      );

      const asinValues = asinButtons.map((b) => b.getAttribute('value') || '');
      const idValues = idButtons.map((b) => b.getAttribute('value') || '');

      const len = Math.min(asinValues.length, idValues.length);
      const map: Record<string, string> = {};

      for (let i = 0; i < len; i++) {
        const asin = asinValues[i].trim();
        const aaid = idValues[i].trim();
        if (!asin || !aaid) continue;
        map[asin] = aaid;
      }

      const result: Mapping[] = Object.entries(map).map(([asin, aaid]) => ({
        asin,
        aaid
      }));

      setMappings(result);
      showSnack(`Extracted ${result.length} unique mappings`);
    } catch (e) {
      console.error(e);
      setError('Failed to parse HTML');
    }
  };

  const copyAsinAaid = async () => {
    const text = mappings.map((m) => `${m.asin}: ${m.aaid}`).join('\n');
    await navigator.clipboard.writeText(text);
    showSnack('ASIN: AAID list copied');
  };

  const copyAsinList = async () => {
    const text = mappings.map((m) => m.asin).join(',');
    await navigator.clipboard.writeText(text);
    showSnack('ASIN list copied');
  };

  return (
    <Box>
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardHeader
          title="ASIN & AAID Extractor"
          subheader="Paste HTML from your AAID page and extract unique ASIN: AAID mappings."
        />
        <CardContent>
          <TextField
            label="Input HTML"
            placeholder="Paste HTML here..."
            multiline
            minRows={8}
            rows={8} // Initial number of rows
            maxRows={8} // Maximum number of rows before scrolling
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

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={parseHtml} disabled={!input.trim()}>
              Extract ASIN/AAID
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={3}>
        <CardHeader
          title="Results"
          subheader={
            mappings.length
              ? `Unique pairs discovered: ${mappings.length}`
              : 'No results yet.'
          }
          action={
            mappings.length > 0
          }
        />

        <Divider />
        <CardContent>
          {mappings.length === 0 && (
            <Typography color="text.secondary">
              Run an extraction to see ASIN: AAID mappings here.
            </Typography>
          )}

          {mappings.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                ASIN:AAID
              <IconButton size="small" onClick={copyAsinAaid}>
                <ContentCopyIcon fontSize="small"/>
              </IconButton>
              </Typography>

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
                {mappings.map((m) => `${m.asin}: ${m.aaid}`).join('\n')}
              </Box>

              <Typography
                variant="subtitle2"
                sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                ASIN
                <IconButton size="small" onClick={copyAsinList}>
                  <ContentCopyIcon fontSize="small"/>
                </IconButton>
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
                {mappings.map((m) => m.asin).join(',')}
              </Box>
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

export default AsinAaidExtractor;