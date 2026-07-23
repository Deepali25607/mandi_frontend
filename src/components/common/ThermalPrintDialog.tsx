import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import BluetoothRoundedIcon from '@mui/icons-material/BluetoothRounded';
import type { InvoiceData } from '@/utils/invoice';
import {
  loadThermalSettings,
  paperWidthMm,
  saveThermalSettings,
  type PaperChoice,
  type ThermalFormat,
  type ThermalSettings,
} from '@/printing/settings';
import { effectiveCols, fallbackToPdf, previewText, printReceipt } from '@/printing/printReceipt';

/**
 * Print preview + go button for Bluetooth thermal printing. The preview text
 * comes from the SAME layout engine that builds the printer payload, so what
 * you see is what the paper gets.
 */
export default function ThermalPrintDialog({ doc, onClose }: { doc: InvoiceData | null; onClose: () => void }) {
  const [s, setS] = useState<ThermalSettings>(() => loadThermalSettings());
  const [error, setError] = useState<string | null>(null);
  const [offerPdf, setOfferPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  const set = (patch: Partial<ThermalSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      saveThermalSettings(next);
      return next;
    });
  };

  const cols = effectiveCols(s);
  const preview = useMemo(() => {
    if (!doc) return '';
    try {
      return previewText(doc, s);
    } catch (e) {
      return (e as Error).message;
    }
  }, [doc, s]);

  const print = async () => {
    if (!doc) return;
    setError(null);
    setPrinting(true);
    const res = await printReceipt(doc, { printerType: 'bluetooth' });
    setPrinting(false);
    if (res.ok) { onClose(); return; }
    if (res.cancelled) return; // user closed the chooser — stay quiet
    setError(res.message ?? 'Print failed.');
    setOfferPdf(Boolean(res.offerPdf));
  };

  return (
    <Dialog open={Boolean(doc)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BluetoothRoundedIcon color="primary" /> Thermal print preview
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select fullWidth size="small" label="Paper" value={s.paper}
              onChange={(e) => set({ paper: e.target.value as PaperChoice })}
              helperText={`${paperWidthMm(s)}mm · ${cols} chars/line`}
            >
              <MenuItem value="58">2 inch · 58mm</MenuItem>
              <MenuItem value="80">3 inch · 80mm</MenuItem>
              <MenuItem value="104">4 inch · 104mm</MenuItem>
              <MenuItem value="custom">Custom ({s.customWidthMm}mm)</MenuItem>
            </TextField>
            <TextField
              select fullWidth size="small" label="Format" value={s.format}
              onChange={(e) => set({ format: e.target.value as ThermalFormat })}
              helperText={s.format === 'image' ? 'Best compatibility' : 'Printer text engine required'}
            >
              <MenuItem value="image">Image (recommended)</MenuItem>
              <MenuItem value="modern">Modern text</MenuItem>
              <MenuItem value="old">Old plain text</MenuItem>
            </TextField>
          </Stack>

          {/* WYSIWYG: rendered from the same ReceiptLine[] as the print job. */}
          <Box
            sx={{
              bgcolor: '#fffef5',
              color: '#111',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1.5, py: 1,
              overflowX: 'auto',
              mx: 'auto',
              maxWidth: '100%',
            }}
          >
            <Typography component="pre" sx={{ fontFamily: '"Courier New", ui-monospace, monospace', fontSize: 12, lineHeight: 1.35, m: 0, whiteSpace: 'pre' }}>
              {preview}
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              action={offerPdf && doc ? (
                <Button color="inherit" size="small" onClick={() => { fallbackToPdf(doc); onClose(); }}>
                  Save PDF
                </Button>
              ) : undefined}
            >
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="outlined" onClick={() => { if (doc) { fallbackToPdf(doc); } }}>PDF</Button>
        <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={print} disabled={printing || !doc}>
          {printing ? 'Printing…' : 'Print'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
