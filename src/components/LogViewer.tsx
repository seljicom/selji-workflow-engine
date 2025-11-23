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
  Typography,
  Chip
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

interface LogEntry {
  id: number;
  level: string;
  message: string;
  context: string | null;
  created_at: string;
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [level, setLevel] = useState('info');

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'success'
  });

  const show = (m: string, s: 'success' | 'error' | 'info' = 'success') =>
    setSnack({ open: true, msg: m, severity: s });

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs?limit=200`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const json: LogEntry[] = await res.json();
      setLogs(json);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const deleteLog = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/logs/${id}`, { method: 'DELETE' });
      show('Log deleted');
      loadLogs();
    } catch {
      show('Delete failed', 'error');
    }
  };

  const addLog = async () => {
    try {
      await fetch(`${API_BASE}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, level, context: { ui: true } })
      });
      setModal(false);
      setMsg('');
      show('Log added');
      loadLogs();
    } catch {
      show('Failed to add log', 'error');
    }
  };

  const closeSnack = () => setSnack({ ...snack, open: false });

  return (
    <Card elevation={3}>
      <CardHeader
        title="Log Viewer"
        subheader="View and manage backend logs"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModal(true)}>
            Add Log
          </Button>
        }
      />
      <Divider />
      <CardContent>
        {err && <Alert severity="error">{err}</Alert>}
        {loading && <Typography>Loading…</Typography>}
        {!loading && logs.length === 0 && (
          <Typography color="text.secondary">No logs yet.</Typography>
        )}
        {!loading && logs.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Level</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Chip
                      label={l.level}
                      size="small"
                      color={
                        l.level === 'error'
                          ? 'error'
                          : l.level === 'warn'
                          ? 'warning'
                          : 'info'
                      }
                    />
                  </TableCell>
                  <TableCell>{l.message}</TableCell>
                  <TableCell>{l.created_at}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => deleteLog(l.id)}>
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
        <DialogTitle>Add Log Entry</DialogTitle>
        <DialogContent>
          <TextField
            label="Level (info, warn, error)"
            fullWidth
            margin="normal"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
          <TextField
            label="Message"
            fullWidth
            margin="normal"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={addLog}>
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

export default LogViewer;
