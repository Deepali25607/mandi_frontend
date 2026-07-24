import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AndroidRoundedIcon from '@mui/icons-material/AndroidRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import QRCode from 'qrcode';

/** Chrome's install event (not yet in the standard TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome fires beforeinstallprompt once, early — capture it at module load so
// the button can re-trigger the native install sheet whenever it's clicked.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

const isStandalone = () =>
  typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

/** The address to install from — works for local dev and nexussoftlab.com/mandi alike. */
const appUrl = () => window.location.origin + import.meta.env.BASE_URL;

/**
 * "Get the Android App" button for the sign-in page. On Android Chrome it
 * opens the native install sheet directly; everywhere else it shows a QR code
 * that phones can scan, plus the manual install steps. The "app" is this site
 * installed as a PWA — same code, full-screen, with its own launcher icon.
 */
export default function AndroidAppButton() {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState('');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(appUrl(), { width: 220, margin: 1, color: { dark: '#1a1a1a' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [open]);

  if (isStandalone()) return null; // already running as the installed app

  const click = async () => {
    if (deferredPrompt) {
      // Native Android/Chrome install dialog.
      const evt = deferredPrompt;
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') {
        deferredPrompt = null;
        setInstalled(true);
      }
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="outlined"
        color="success"
        size="large"
        startIcon={<AndroidRoundedIcon />}
        onClick={click}
      >
        {installed ? 'App installed — check your home screen' : 'Get the Android App'}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AndroidRoundedIcon color="success" />
          <Box sx={{ flexGrow: 1 }}>Install Mandi ERP on Android</Box>
          <IconButton size="small" onClick={() => setOpen(false)}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center" sx={{ pb: 1 }}>
            {qr ? (
              <Box
                component="img"
                src={qr}
                alt="QR code to open Mandi ERP"
                sx={{ width: 200, height: 200, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              />
            ) : (
              <Alert severity="info" sx={{ width: '100%' }}>Open {appUrl()} on your phone.</Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Scan with your phone camera to open <strong>{appUrl()}</strong> in Chrome.
            </Typography>
            <Box sx={{ width: '100%' }}>
              {[
                'Scan the QR (or open the link) in Chrome on your Android phone.',
                'Tap the ⋮ menu → “Install app” (or “Add to Home screen”).',
                'Mandi ERP appears on your home screen and opens full-screen like any app.',
              ].map((step, i) => (
                <Stack key={step} direction="row" spacing={1.25} sx={{ mb: 1 }} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      bgcolor: 'success.main', color: '#fff', fontSize: 13, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography variant="body2">{step}</Typography>
                </Stack>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              Works offline-ready and updates automatically — no Play Store needed.
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
