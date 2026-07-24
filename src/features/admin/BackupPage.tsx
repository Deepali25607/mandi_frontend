import { useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { useAppSelector } from '@/store/hooks';
import { API_BASE } from '@/utils/apiBase';

interface ParsedBackup {
  meta?: { organizationName?: string; organizationId?: string; exportedAt?: string; recordCounts?: Record<string, number>; format?: string };
}

export default function BackupPage() {
  const token = useAppSelector((s) => s.auth.token);
  const orgId = useAppSelector((s) => s.auth.user?.organizationId);

  // ---- Download ----
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // ---- Restore ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreDone, setRestoreDone] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ---- Factory reset ----
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPw, setResetPw] = useState('');
  const [resetAck, setResetAck] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<string | null>(null);

  /** Returns true only when the backup file actually reached the device. */
  const download = async (): Promise<boolean> => {
    setBusy(true); setError(null); setDone(null);
    try {
      const res = await fetch(`${API_BASE}/backup/export`, { headers: { Authorization: `Bearer ${token}` } });
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
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create backup.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Backup to the device FIRST, then wipe — never delete without the safety copy. */
  const runReset = async () => {
    setResetting(true); setResetError(null); setResetDone(null);
    try {
      const saved = await download();
      if (!saved) {
        throw new Error('The automatic backup could not be downloaded — reset cancelled, nothing was deleted.');
      }
      const res = await fetch(`${API_BASE}/backup/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPw }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
        throw new Error(msg || `Reset failed (${res.status})`);
      }
      const total = Object.values(payload?.wiped ?? {}).reduce((s: number, n) => s + (Number(n) || 0), 0);
      setResetDone(`Company data deleted — ${total} records removed. Your backup was saved to this device. Refreshing…`);
      setResetOpen(false);
      setResetPw('');
      setTimeout(() => window.location.assign(import.meta.env.BASE_URL), 2200);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Could not reset company data.');
    } finally {
      setResetting(false);
    }
  };

  const pickFile = async (f?: File | null) => {
    setRestoreError(null); setRestoreDone(null); setParsed(null); setFile(null);
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text) as ParsedBackup;
      if (json?.meta?.format !== 'mandi-erp-backup') {
        setRestoreError('That file is not a Mandi ERP backup.');
        return;
      }
      if (json.meta.organizationId && orgId && json.meta.organizationId !== orgId) {
        setRestoreError("This backup belongs to a different organization and can't be restored here.");
        return;
      }
      setFile(f);
      setParsed(json);
    } catch {
      setRestoreError('Could not read the file — make sure it is a valid backup JSON.');
    }
  };

  const runRestore = async () => {
    if (!file) return;
    setRestoring(true); setRestoreError(null); setRestoreDone(null);
    try {
      const text = await file.text();
      const res = await fetch(`${API_BASE}/backup/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: text,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
        throw new Error(msg || `Restore failed (${res.status})`);
      }
      const total = Object.values(payload?.restored ?? {}).reduce((s: number, n) => s + (Number(n) || 0), 0);
      setRestoreDone(`Restore complete — ${total} records reloaded. The app will refresh in a moment.`);
      setConfirmOpen(false);
      // Hard refresh (base-path aware) so every screen re-fetches the restored data.
      setTimeout(() => window.location.assign(import.meta.env.BASE_URL), 1800);
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Could not restore backup.');
    } finally {
      setRestoring(false);
    }
  };

  const counts = parsed?.meta?.recordCounts ?? {};
  const totalRecords = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Data Backup</Typography>
        <Typography variant="body2" color="text.secondary">
          Download a copy of <strong>your organization's</strong> data, or reload a previous backup.
        </Typography>
      </Box>

      {/* ---- Download ---- */}
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
            </List>

            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
            {done && <Alert severity="success" sx={{ width: '100%' }}>{done}</Alert>}

            <Button variant="contained" size="large" startIcon={<DownloadRoundedIcon />} onClick={download} disabled={busy}>
              {busy ? 'Preparing…' : 'Download backup'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ---- Restore ---- */}
      <Card sx={{ borderColor: 'warning.light' }}>
        <CardContent>
          <Stack spacing={2} alignItems="flex-start">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ bgcolor: 'warning.main', color: '#1a1a1a', width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center' }}>
                <RestoreRoundedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Reload a backup</Typography>
                <Typography variant="body2" color="text.secondary">Restore your organization from a backup file you downloaded earlier.</Typography>
              </Box>
            </Box>

            <Alert severity="warning" sx={{ width: '100%' }}>
              <AlertTitle sx={{ fontWeight: 800 }}>This replaces your current data</AlertTitle>
              Restoring overwrites <strong>all current masters and transactions</strong> with the file's contents.
              Any entries added <strong>after</strong> this backup was taken will be <strong>permanently deleted</strong>.
              Your users and logins are not affected.
            </Alert>

            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => fileRef.current?.click()}>
              {file ? 'Choose a different file' : 'Choose backup file'}
            </Button>

            {parsed && (
              <Box sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{parsed.meta?.organizationName ?? 'Backup'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Taken {parsed.meta?.exportedAt ? new Date(parsed.meta.exportedAt).toLocaleString() : 'unknown'} · {totalRecords} records
                </Typography>
              </Box>
            )}

            {restoreError && <Alert severity="error" sx={{ width: '100%' }}>{restoreError}</Alert>}
            {restoreDone && <Alert severity="success" sx={{ width: '100%' }}>{restoreDone}</Alert>}

            <Button
              variant="contained"
              color="warning"
              size="large"
              startIcon={<RestoreRoundedIcon />}
              disabled={!parsed || restoring}
              onClick={() => { setAck(false); setConfirmOpen(true); }}
            >
              Restore this backup
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ---- Danger zone: factory reset ---- */}
      <Card sx={{ borderColor: 'error.light' }}>
        <CardContent>
          <Stack spacing={2} alignItems="flex-start">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ bgcolor: 'error.main', color: '#fff', width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center' }}>
                <DeleteForeverRoundedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Reset company data</Typography>
                <Typography variant="body2" color="text.secondary">
                  Start fresh: permanently delete every master and transaction in this company.
                </Typography>
              </Box>
            </Box>

            <Alert severity="error" sx={{ width: '100%' }}>
              <AlertTitle sx={{ fontWeight: 800 }}>This deletes everything</AlertTitle>
              All items, suppliers, customers, arrivals, stock, sales, collections, settlements, expenses,
              bank accounts and price history will be <strong>permanently deleted</strong>. User accounts, logins and
              settings are kept. A full backup is downloaded to this device <strong>automatically before</strong> anything
              is deleted, and your password is required to confirm.
            </Alert>

            {resetError && <Alert severity="error" sx={{ width: '100%' }}>{resetError}</Alert>}
            {resetDone && <Alert severity="success" sx={{ width: '100%' }}>{resetDone}</Alert>}

            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<DeleteForeverRoundedIcon />}
              onClick={() => { setResetPw(''); setResetAck(false); setResetError(null); setResetOpen(true); }}
            >
              Reset company data…
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ---- Reset confirmation (password required) ---- */}
      <Dialog open={resetOpen} onClose={() => !resetting && setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberRoundedIcon color="error" /> Delete ALL company data?
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 1.5 }}>
            Every master and transaction will be permanently deleted. Only user logins and settings survive.
            This cannot be undone — except by restoring the backup that is downloaded first.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            A full backup will download to this device <strong>before</strong> deletion. If that download fails,
            nothing is deleted.
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Your password"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            autoComplete="current-password"
            helperText="Re-enter your login password to confirm it's really you"
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox checked={resetAck} onChange={(e) => setResetAck(e.target.checked)} />}
            label="I understand ALL company data will be permanently deleted."
          />
          {resetError && <Alert severity="error" sx={{ mt: 1 }}>{resetError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)} disabled={resetting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!resetAck || !resetPw || resetting}
            onClick={runReset}
          >
            {resetting ? 'Backing up & deleting…' : 'Download backup & delete all'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Confirmation ---- */}
      <Dialog open={confirmOpen} onClose={() => !restoring && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberRoundedIcon color="warning" /> Confirm restore
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            You are about to overwrite <strong>{parsed?.meta?.organizationName ?? 'your organization'}</strong> with the
            backup from <strong>{parsed?.meta?.exportedAt ? new Date(parsed.meta.exportedAt).toLocaleDateString() : 'the selected file'}</strong>.
          </Typography>
          <Alert severity="error" sx={{ mb: 1 }}>
            All current masters and transactions will be deleted and replaced. Entries created after this backup
            <strong> cannot be recovered</strong>.
          </Alert>
          <Typography variant="caption" color="text.secondary">
            Tip: download a fresh backup first if you might need today's data.
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <FormControlLabel
            control={<Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)} />}
            label="I understand newer entries will be permanently deleted."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={restoring}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!ack || restoring} onClick={runRestore}>
            {restoring ? 'Restoring…' : 'Restore & replace'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
