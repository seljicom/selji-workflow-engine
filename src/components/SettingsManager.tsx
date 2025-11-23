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

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

interface SettingRow {
  section: string;
  name: string;
  value: string;
  created_at: string;
  updated_at: string;
}

const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'success'
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState('');
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ section: string; name: string } | null>(null);

  const show = (msg: string, severity: 'success' | 'error' | 'info' = 'success') =>
    setSnack({ open: true, msg, severity });

  const closeSnack = () => setSnack({ ...snack, open: false });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (!res.ok) throw new Error('Failed to load settings');
      const json: SettingRow[] = await res.json();
      setSettings(json);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const openNew = () => {
    setEditSection('');
    setEditName('');
    setEditValue('');
    setEditOpen(true);
  };

  const openEdit = (row: SettingRow) => {
    setEditSection(row.section);
    setEditName(row.name);
    setEditValue(row.value);
    setEditOpen(true);
  };

  const saveSetting = async () => {
    if (!editSection.trim() || !editName.trim() || !editValue.trim()) {
      show('All fields are required', 'error');
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/settings/${encodeURIComponent(editSection)}/${encodeURIComponent(editName)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: editValue })
        }
      );
      if (!res.ok) throw new Error('Failed to save');
      setEditOpen(false);
      show('Setting saved');
      loadSettings();
    } catch (e: any) {
      show(e.message || 'Failed to save', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/settings/${encodeURIComponent(deleteTarget.section)}/${encodeURIComponent(deleteTarget.name)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete');
      show('Setting deleted');
      setDeleteTarget(null);
      loadSettings();
    } catch (e: any) {
      show(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <Box>
      <Card elevation={3}>
        <CardHeader
          title="Settings Manager"
          subheader="View, edit, and create stored workflow settings."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              Add Setting
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {error && <Alert severity="error">{error}</Alert>}
          {loading && <Typography>Loading…</Typography>}
          {!loading && settings.length === 0 && (
            <Typography color="text.secondary">No settings stored.</Typography>
          )}
          {!loading && settings.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Section</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settings.map((s) => (
                  <TableRow key={`${s.section}:${s.name}`}>
                    <TableCell>{s.section}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.value}</TableCell>
                    <TableCell>{s.updated_at}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => openEdit(s)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => setDeleteTarget({ section: s.section, name: s.name })}
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Setting</DialogTitle>
        <DialogContent>
          <TextField
            label="Section"
            fullWidth
            margin="normal"
            value={editSection}
            onChange={(e) => setEditSection(e.target.value)}
          />
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            label="Value"
            fullWidth
            margin="normal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSetting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Setting?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete{' '}
            <strong>
              {deleteTarget?.section}/{deleteTarget?.name}
            </strong>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={closeSnack}
        message={snack.msg}
      />
    </Box>
  );
};

export default SettingsManager;
