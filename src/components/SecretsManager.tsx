import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

interface Secret {
  id: number;
  name: string;
  value?: string;
  created_at: string;
  updated_at: string;
}

const SecretsManager: React.FC = () => {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'success'
  });

  const show = (msg: string, severity: 'success' | 'error' | 'info' = 'success') =>
    setSnack({ open: true, msg, severity });

  const closeSnack = () => setSnack({ ...snack, open: false });

  const loadSecrets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/secrets?includeValues=1`);
      if (!res.ok) throw new Error('Failed to load secrets');
      const json: Secret[] = await res.json();
      setSecrets(json);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || 'Failed to load secrets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, []);

  const saveSecret = async () => {
    try {
      await fetch(`${API_BASE}/api/secrets/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      setModal(false);
      setName('');
      setValue('');
      show('Secret saved');
      loadSecrets();
    } catch {
      show('Failed to save secret', 'error');
    }
  };

  const deleteSecret = async (n: string) => {
    try {
      await fetch(`${API_BASE}/api/secrets/${encodeURIComponent(n)}`, {
        method: 'DELETE'
      });
      show('Secret deleted');
      loadSecrets();
    } catch {
      show('Failed to delete secret', 'error');
    }
  };

  return (
    <Card elevation={3}>
      <CardHeader
        title="Secrets Manager"
        subheader="Values are encrypted at rest in SQLite"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModal(true)}>
            Add Secret
          </Button>
        }
      />
      <Divider />
      <CardContent>
        {err && <Alert severity="error">{err}</Alert>}
        {loading && <Typography>Loading…</Typography>}
        {!loading && secrets.length === 0 && (
          <Typography color="text.secondary">No secrets stored.</Typography>
        )}

        {!loading && secrets.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secrets.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <Typography fontFamily="monospace">
                      {s.value || '(not decrypted)'}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.updated_at}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => deleteSecret(s.name)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add / Update Secret</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Value"
            fullWidth
            margin="normal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSecret}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={closeSnack}
        message={snack.msg}
      />
    </Card>
  );
};

export default SecretsManager;
