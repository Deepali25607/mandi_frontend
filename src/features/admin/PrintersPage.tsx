import { useState } from 'react';
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
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  useCreatePrinterProfileMutation,
  useDeletePrinterProfileMutation,
  useGetPrinterProfilesQuery,
  useUpdatePrinterProfileMutation,
} from '@/api/adminApi';
import { defaultFontFor, printThermalInvoice, type InvoiceData } from '@/utils/invoice';
import { useAppSelector } from '@/store/hooks';
import ThermalPrinterSettings from './ThermalPrinterSettings';
import type { PrinterProfile } from '@/types';

/** Common roll widths — picking one prefills the width; "Custom" allows any value. */
const COMMON_WIDTHS = [
  { mm: 58, label: '58mm · 2 inch' },
  { mm: 80, label: '80mm · 3 inch' },
  { mm: 104, label: '104mm · 4 inch' },
  { mm: 112, label: '112mm · 4 inch (wide)' },
];

const blank = { name: '', widthMm: '80', fontSize: '10.5', marginMm: '2', isDefault: false };

export default function PrintersPage() {
  // Everyone can view profiles, test-print and set up their own Bluetooth
  // printer; adding/editing the org-wide profiles stays admin-only.
  const isAdmin = useAppSelector((s) => s.auth.user?.role) === 'org_admin';
  const { data: printers, isLoading } = useGetPrinterProfilesQuery();
  const [createPrinter, { isLoading: creating }] = useCreatePrinterProfileMutation();
  const [updatePrinter, { isLoading: updating }] = useUpdatePrinterProfileMutation();
  const [deletePrinter] = useDeletePrinterProfileMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterProfile | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const startAdd = () => {
    setEditing(null);
    setForm(blank);
    setError(null);
    setOpen(true);
  };

  const startEdit = (p: PrinterProfile) => {
    setEditing(p);
    setForm({
      name: p.name,
      widthMm: String(p.widthMm),
      fontSize: String(p.fontSize),
      marginMm: String(p.marginMm),
      isDefault: p.isDefault,
    });
    setError(null);
    setOpen(true);
  };

  const width = Number(form.widthMm);
  const canSave = form.name.trim().length > 0 && width >= 20 && width <= 210;

  const save = async () => {
    setError(null);
    const body = {
      name: form.name.trim(),
      widthMm: width,
      fontSize: Number(form.fontSize) || defaultFontFor(width),
      marginMm: Number(form.marginMm) || 0,
      isDefault: form.isDefault,
    };
    try {
      if (editing) {
        await updatePrinter({ id: editing.id, body }).unwrap();
        setToast(`${body.name} updated`);
      } else {
        await createPrinter(body).unwrap();
        setToast(`${body.name} added`);
      }
      setOpen(false);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save printer.');
    }
  };

  const remove = async (p: PrinterProfile) => {
    try {
      await deletePrinter(p.id).unwrap();
      setToast(`${p.name} removed`);
    } catch {
      setToast('Could not remove printer.');
    }
  };

  /** Print a dummy invoice so the paper size can be checked before going live. */
  const testPrint = (p: PrinterProfile) => {
    const sample: InvoiceData = {
      company: { name: 'Test Print', address: 'Printer alignment check', mobile: '—' },
      invoiceNo: 'TEST-0001',
      date: new Date().toISOString().slice(0, 10),
      customerName: 'Sample Customer',
      lines: [
        { name: 'Onion', qty: 30, weight: 1415.5, rate: 29, amount: 41049.5 },
        { name: 'Potato', qty: 12, weight: 600, rate: 18, amount: 10800 },
      ],
      totalQty: 42,
      totalWeight: 2015.5,
      netAmount: 51849.5,
      paymentMode: 'cash',
    };
    printThermalInvoice(sample, { widthMm: p.widthMm, fontSize: p.fontSize, marginMm: p.marginMm });
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Printers</Typography>
          <Typography variant="body2" color="text.secondary">
            Add any thermal or roll printer by its paper width. Printing goes through your
            browser's print dialog, so any printer installed on the device works.
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={startAdd}>
            Add printer
          </Button>
        )}
      </Stack>

      {/* Direct Bluetooth thermal printing (per-browser settings). */}
      <ThermalPrinterSettings />

      {isLoading ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : (printers ?? []).length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No printers yet.{isAdmin ? ' Add one to start printing invoices.' : ' Ask your admin to add one.'}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {(printers ?? []).map((p) => (
            <Card key={p.id} variant="outlined">
              <CardContent sx={{ py: '12px !important' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PrintRoundedIcon color={p.isActive ? 'primary' : 'disabled'} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography sx={{ fontWeight: 700 }} noWrap>{p.name}</Typography>
                      {p.isDefault && (
                        <Chip size="small" color="primary" icon={<StarRoundedIcon />} label="Default" sx={{ height: 20 }} />
                      )}
                      {!p.isActive && <Chip size="small" label="Disabled" sx={{ height: 20 }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {p.widthMm}mm wide · {p.fontSize}px font · {p.marginMm}mm margin
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => testPrint(p)}>Test print</Button>
                  {isAdmin && (
                    <>
                      <IconButton size="small" onClick={() => startEdit(p)}><EditRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => remove(p)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit printer' : 'Add printer'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Printer name" value={form.name} autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              helperText="e.g. Counter TVS RP3200"
            />
            <TextField
              select label="Common paper size" value=""
              onChange={(e) => {
                const mm = Number(e.target.value);
                setForm((f) => ({ ...f, widthMm: String(mm), fontSize: String(defaultFontFor(mm)) }));
              }}
              helperText="Optional — prefills width and font"
            >
              {COMMON_WIDTHS.map((w) => <MenuItem key={w.mm} value={w.mm}>{w.label}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Paper width (mm)" type="number" value={form.widthMm}
                onChange={(e) => setForm({ ...form, widthMm: e.target.value })}
                error={Boolean(form.widthMm) && (width < 20 || width > 210)}
                helperText={width < 20 || width > 210 ? '20–210mm' : 'Any width'}
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                label="Font size (px)" type="number" value={form.fontSize}
                onChange={(e) => setForm({ ...form, fontSize: e.target.value })}
                helperText="Smaller = more per line"
                inputProps={{ inputMode: 'decimal' }}
              />
            </Stack>
            <TextField
              label="Margin (mm)" type="number" value={form.marginMm}
              onChange={(e) => setForm({ ...form, marginMm: e.target.value })}
              helperText="Unprintable edge on each side"
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              select label="Default printer" value={form.isDefault ? 'yes' : 'no'}
              onChange={(e) => setForm({ ...form, isDefault: e.target.value === 'yes' })}
              helperText="Shown first in the print menu"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!canSave || creating || updating}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
