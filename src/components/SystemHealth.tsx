import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Typography,
  Divider
} from '@mui/material';

const API_BASE =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:4000';

interface HealthResponse {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
  startedAt: string;
  db: { ok: boolean };
}

const SystemHealth: React.FC = () => {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/system/health`);
      if (!res.ok) throw new Error('Failed to load system health');
      const json: HealthResponse = await res.json();
      setData(json);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card elevation={3}>
      <CardHeader title="System Health" subheader="Live backend and database status" />
      <Divider />
      <CardContent>
        {loading && <CircularProgress />}
        {err && <Alert severity="error">{err}</Alert>}
        {data && !loading && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h6">
              Status:{' '}
              <strong style={{ color: data.status === 'ok' ? 'green' : 'orange' }}>
                {data.status.toUpperCase()}
              </strong>
            </Typography>
            <Typography>
              Uptime: <strong>{Math.round(data.uptimeSeconds)} seconds</strong>
            </Typography>
            <Typography>
              Started: <strong>{data.startedAt}</strong>
            </Typography>
            <Typography>
              Timestamp: <strong>{data.timestamp}</strong>
            </Typography>
            <Typography>
              Database:{' '}
              <strong style={{ color: data.db.ok ? 'green' : 'red' }}>
                {data.db.ok ? 'Connected' : 'ERROR'}
              </strong>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealth;
