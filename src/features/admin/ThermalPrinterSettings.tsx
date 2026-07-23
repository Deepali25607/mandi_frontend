import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import BluetoothRoundedIcon from '@mui/icons-material/BluetoothRounded';
import BluetoothConnectedRoundedIcon from '@mui/icons-material/BluetoothConnectedRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import { useGetOrganizationQuery } from '@/api/adminApi';
import {
  DEFAULT_THERMAL_SETTINGS,
  loadThermalSettings,
  paperWidthMm,
  saveThermalSettings,
  type ThermalFormat,
  type ThermalSettings,
} from '@/printing/settings';
import { colsForWidth } from '@/printing/layout';
import {
  buildPayload,
  effectiveCols,
  printTestLine,
  sampleBill,
} from '@/printing/printReceipt';
import {
  haveSessionDevice,
  isWebBluetoothAvailable,
  pickDevice,
  printOverBle,
  probeChannels,
  PrintTransportError,
  type ProbeChannel,
} from '@/printing/webBluetooth';

const FORMAT_HELP: Record<ThermalFormat, string> = {
  image: 'Prints the bill as a picture — works on every printer, keeps ₹ and Hindi. Recommended.',
  modern: 'Styled printer text (bold, sizes, cut). Needs a healthy ESC/POS text engine.',
  old: 'Plain text only — maximum compatibility fallback for very old units.',
};

/**
 * Bluetooth thermal printer settings — stored in THIS browser's localStorage.
 * (Each browser and the mobile app keep their own printer settings.)
 */
export default function ThermalPrinterSettings() {
  const { data: org } = useGetOrganizationQuery();
  const [s, setS] = useState<ThermalSettings>(() => loadThermalSettings());
  const [toast, setToast] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<ProbeChannel[] | null>(null);

  const set = (patch: Partial<ThermalSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      saveThermalSettings(next);
      return next;
    });
  };

  const widthMm = paperWidthMm(s);
  const cols = effectiveCols(s);
  const bleOk = isWebBluetoothAvailable();
  const sessionLive = Boolean(s.deviceId && haveSessionDevice(s.deviceId));
  const isText = s.format !== 'image';

  const connect = async () => {
    try {
      const dev = await pickDevice();
      set({ deviceId: dev.id, deviceName: dev.name, pinnedChannel: null });
      setToast({ severity: 'success', text: `Connected: ${dev.name}` });
    } catch (e) {
      if (e instanceof PrintTransportError && e.code === 'user-cancelled') return; // silent
      setToast({ severity: 'error', text: (e as Error).message });
    }
  };

  const ensureDevice = async (): Promise<string | null> => {
    if (s.deviceId && haveSessionDevice(s.deviceId)) return s.deviceId;
    // Stored id but no live object (fresh page) — one tap re-picks it.
    setToast({ severity: 'info', text: 'Choose the printer in the browser popup (needed once per session).' });
    try {
      const dev = await pickDevice();
      set({ deviceId: dev.id, deviceName: dev.name });
      return dev.id;
    } catch (e) {
      if (!(e instanceof PrintTransportError && e.code === 'user-cancelled')) {
        setToast({ severity: 'error', text: (e as Error).message });
      }
      return null;
    }
  };

  const testLine = async () => {
    const id = await ensureDevice();
    if (!id) return;
    setBusy(true);
    const res = await printTestLine(id, s.pinnedChannel ?? undefined);
    setBusy(false);
    setToast(res.ok
      ? { severity: 'success', text: 'Test sent — whichever labelled block printed identifies the printer language.' }
      : { severity: 'error', text: res.message ?? 'Test failed.' });
  };

  const testBill = async (format: ThermalFormat) => {
    const id = await ensureDevice();
    if (!id) return;
    setBusy(true);
    try {
      const payload = buildPayload(sampleBill(org?.name ?? 'Sample Mandi'), { ...s, format });
      await printOverBle(id, payload, s.pinnedChannel ?? undefined);
      setToast({ severity: 'success', text: `Sample bill sent (${format} format, ${cols} cols).` });
    } catch (e) {
      setToast({ severity: 'error', text: (e as Error).message });
    }
    setBusy(false);
  };

  const runProbe = async () => {
    const id = await ensureDevice();
    if (!id) return;
    setBusy(true);
    try {
      const channels = await probeChannels(id);
      setProbe(channels);
    } catch (e) {
      setToast({ severity: 'error', text: (e as Error).message });
    }
    setBusy(false);
  };

  const pinChannel = (key: string | null) => {
    set({ pinnedChannel: key });
    setProbe(null);
    setToast({ severity: 'success', text: key ? 'Print channel pinned for future prints.' : 'No channel pinned.' });
  };

  const paperItems = useMemo(
    () => [
      { value: '58', label: '2 inch · 58mm' },
      { value: '80', label: '3 inch · 80mm' },
      { value: '104', label: '4 inch · 104mm' },
      { value: 'custom', label: 'Custom width…' },
    ],
    [],
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BluetoothRoundedIcon color="primary" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Bluetooth thermal printing</Typography>
              <Typography variant="caption" color="text.secondary">
                Direct printing without the system dialog. Settings are saved in this browser only —
                the app and each browser keep their own.
              </Typography>
            </Box>
          </Stack>

          <TextField
            select label="Printer type" value={s.printerType}
            onChange={(e) => set({ printerType: e.target.value as ThermalSettings['printerType'] })}
            helperText={s.printerType === 'regular' ? 'Bills print via the system print dialog (any installed printer).' : 'Bills print straight to the Bluetooth thermal printer below.'}
          >
            <MenuItem value="regular">Regular printer (A4 / system dialog)</MenuItem>
            <MenuItem value="bluetooth">Bluetooth thermal printer</MenuItem>
            <MenuItem value="usb" disabled>USB thermal — coming soon</MenuItem>
            <MenuItem value="network" disabled>Network (LAN) — coming soon</MenuItem>
          </TextField>

          {s.printerType === 'bluetooth' && (
            <>
              {!bleOk && (
                <Alert severity="warning">
                  This browser has no Web Bluetooth (Safari/Firefox). Use Chrome or Edge here — printing
                  will otherwise fall back to PDF.
                </Alert>
              )}

              {/* ---- Device ---- */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {s.deviceName ? (
                  <Chip
                    icon={sessionLive ? <BluetoothConnectedRoundedIcon /> : <BluetoothRoundedIcon />}
                    color={sessionLive ? 'success' : 'default'}
                    label={`${s.deviceName}${sessionLive ? ' · Connected' : ' · Saved (tap to reconnect)'}`}
                    onClick={connect}
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">No printer connected yet.</Typography>
                )}
                <Button size="small" variant="outlined" onClick={connect} disabled={!bleOk}>
                  {s.deviceName ? 'Connect another device' : 'Connect printer'}
                </Button>
                {s.deviceName && (
                  <Button size="small" color="inherit" onClick={() => set({ deviceId: null, deviceName: null, pinnedChannel: null })}>
                    Forget
                  </Button>
                )}
              </Stack>

              <Divider />

              {/* ---- Paper & format ---- */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth label="Paper size" value={s.paper}
                  onChange={(e) => set({ paper: e.target.value as ThermalSettings['paper'] })}
                  helperText={`${widthMm}mm → ${colsForWidth(widthMm)} characters per line`}
                >
                  {paperItems.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </TextField>
                {s.paper === 'custom' && (
                  <TextField
                    fullWidth label="Custom width (mm)" type="number" value={s.customWidthMm}
                    onChange={(e) => set({ customWidthMm: Number(e.target.value) })}
                    inputProps={{ min: 40, max: 120 }}
                    helperText="40–120mm"
                  />
                )}
              </Stack>

              <TextField
                select label="Print format" value={s.format}
                onChange={(e) => set({ format: e.target.value as ThermalFormat })}
                helperText={FORMAT_HELP[s.format]}
              >
                <MenuItem value="image">Image (recommended)</MenuItem>
                <MenuItem value="modern">Modern (styled text)</MenuItem>
                <MenuItem value="old">Old (plain text)</MenuItem>
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth label="Characters per line" value={String(s.charsPerLine)}
                  onChange={(e) => set({ charsPerLine: e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as 32 | 48 | 64) })}
                >
                  <MenuItem value="auto">Auto ({colsForWidth(widthMm)})</MenuItem>
                  <MenuItem value="32">32</MenuItem>
                  <MenuItem value="48">48</MenuItem>
                  <MenuItem value="64">64</MenuItem>
                </TextField>
                <TextField
                  select fullWidth label="Encoding" value={s.encoding} disabled={!isText}
                  onChange={(e) => set({ encoding: e.target.value as ThermalSettings['encoding'] })}
                  helperText={isText ? 'Text formats only' : 'Not used by Image format'}
                >
                  <MenuItem value="cp437">CP437 (default)</MenuItem>
                  <MenuItem value="cp850">CP850</MenuItem>
                  <MenuItem value="utf8">UTF-8 (rare)</MenuItem>
                </TextField>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth label="Print density" value={s.density} disabled={!isText}
                  onChange={(e) => set({ density: Number(e.target.value) })}
                  helperText={isText ? '3 = printer default' : 'No effect on Image format'}
                >
                  {[1, 2, 3, 4, 5].map((d) => <MenuItem key={d} value={d}>{d}{d === 3 ? ' (default)' : ''}</MenuItem>)}
                </TextField>
                <TextField
                  select fullWidth label="Feed lines after print" value={s.feedLines}
                  onChange={(e) => set({ feedLines: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <FormControlLabel control={<Switch checked={s.autoCut} onChange={(e) => set({ autoCut: e.target.checked })} />} label="Auto cut" />
                <FormControlLabel control={<Switch checked={s.rememberPrinter} onChange={(e) => set({ rememberPrinter: e.target.checked })} />} label="Remember printer" />
                <FormControlLabel control={<Switch checked={s.autoConnect} onChange={(e) => set({ autoConnect: e.target.checked })} />} label="Auto connect" />
              </Stack>

              <Divider />

              {/* ---- Diagnostics ---- */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScienceRoundedIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Test tools</Typography>
                {s.pinnedChannel && <Chip size="small" label="Channel pinned" onDelete={() => pinChannel(null)} />}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" disabled={busy || !bleOk} onClick={testLine}>Test line</Button>
                <Button size="small" variant="outlined" disabled={busy || !bleOk} onClick={() => testBill('image')}>Sample bill (Image)</Button>
                <Button size="small" variant="outlined" disabled={busy || !bleOk} onClick={() => testBill('modern')}>Sample bill (Modern)</Button>
                <Button size="small" variant="outlined" disabled={busy || !bleOk} onClick={() => testBill('old')}>Sample bill (Old)</Button>
                <Button size="small" variant="outlined" color="secondary" disabled={busy || !bleOk} onClick={runProbe}>Channel probe</Button>
                <Button size="small" color="inherit" onClick={() => { setS({ ...DEFAULT_THERMAL_SETTINGS }); saveThermalSettings(DEFAULT_THERMAL_SETTINGS); }}>
                  Reset settings
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                If nothing ever prints: dual-mode printers pair as TWO devices (classic + BLE) — try the other
                one. The printer's self-test (power off → hold FEED → power on) proves the hardware works.
              </Typography>
            </>
          )}
        </Stack>
      </CardContent>

      {/* Channel probe result: user taps the number that came out on paper. */}
      <Dialog open={Boolean(probe)} onClose={() => setProbe(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Which number printed?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A numbered line was sent through every known print channel. Tap the number that actually
            appeared on paper — that channel will be used for all future prints.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(probe ?? []).map((c) => (
              <Button key={c.key} variant="contained" onClick={() => pinChannel(c.key)}>
                {c.index} — {c.label}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProbe(null)}>None printed</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Card>
  );
}
