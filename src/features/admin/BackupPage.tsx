import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import { useAppSelector } from '@/store/hooks';

export default function BackupPage() {
  const token = useAppSelector((s) => s.auth.token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const download = async () => {
    setBusy(true); setError(null); setDone(null);
    try {
      const res = await fetch('/api/backup/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const payload = await res.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = (payload?.meta?.organizationName ?? 'organization').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const a = document.createElement('a');
      a.href = url;
      a.download = `mandi-backup-${safeName}-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const total = Object.values(payload?.meta?.recordCounts ?? {}).reduce((s: number, n) => s + (Number(n) || 0), 0);
      setDone(`Backup downloaded — ${total} records across ${Object.keys(payload?.meta?.recordCounts ?? {}).length} datasets.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Data Backup</Typography>
        <Typography variant="body2" color="text.secondary">
          Download a complete copy of <strong>your organization's</strong> data to your computer.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={2} alignItems="flex-start">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ bgcolor: 'primary.main', color: '#fff', width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center' }}>
                <BackupRoundedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Full organization backup</Typography>
                <Typography variant="body2" color="text.secondary">One JSON file with all masters and transactions.</Typography>
              </Box>
            </Box>

            <List dense sx={{ width: '100%' }}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}><ShieldRoundedIcon color="success" /></ListItemIcon>
                <ListItemText primary="Tenant-isolated" secondary="Only your organization's records are included — never another tenant's data." />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}><LockRoundedIcon color="success" /></ListItemIcon>
                <ListItemText primary="Credentials excluded" secondary="User password hashes and security answers are never exported." />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}><RestoreRoundedIcon color="action" /></ListItemIcon>
                <ListItemText primary="For retention, migration & disaster recovery" secondary="Keep periodic backups on your own system." />
              </ListItem>
            </List>

            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
            {done && <Alert severity="success" sx={{ width: '100%' }}>{done}</Alert>}

            <Button variant="contained" size="large" startIcon={<DownloadRoundedIcon />} onClick={download} disabled={busy}>
              {busy ? 'Preparing…' : 'Download backup'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
