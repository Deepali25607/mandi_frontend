import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { PaymentMode } from '@/types/domain';
import { KHATA } from '../khataTheme';
import type { EntryType } from '../types';
import { todayKey } from '../utils';

export interface EntryDraft {
  type: EntryType;
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  paymentMode: PaymentMode;
  reference?: string;
  note?: string;
}

interface Props {
  open: boolean;
  partyName: string;
  /** 'got' for a customer receipt, 'gave' for a supplier payment. */
  type: EntryType;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (draft: EntryDraft) => void;
}

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank transfer' },
];

/**
 * Money entry sheet. A customer "You got ₹" becomes a real Collection receipt;
 * a supplier "You gave ₹" becomes a real Supplier Payment.
 */
export default function EntryFormDialog({ open, partyName, type, saving = false, error, onClose, onSave }: Props) {
  const gave = type === 'gave';
  const accent = gave ? KHATA.red : KHATA.green;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setDate(todayKey());
    setMode('cash');
    setReference('');
    setNote('');
  }, [open]);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = () => {
    if (!valid || saving) return;
    onSave({ type, amount: Math.round(value * 100) / 100, date, paymentMode: mode, reference: reference.trim() || undefined, note: note.trim() || undefined });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '12px' } }}>
      <Box sx={{ bgcolor: accent, color: '#fff', px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, opacity: 0.9, letterSpacing: 1 }}>{gave ? 'YOU GAVE ₹' : 'YOU GOT ₹'}</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{gave ? `Payment to ${partyName}` : `Receipt from ${partyName}`}</Typography>
        </Box>
        <IconButton onClick={onClose} disabled={saving} sx={{ color: '#fff' }} aria-label="close">
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            autoFocus
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment>, sx: { fontSize: 26, fontWeight: 700, color: accent } }}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} fullWidth>
              {MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
          </Box>
          {mode !== 'cash' && (
            <TextField label="UTR / reference" value={reference} onChange={(e) => setReference(e.target.value)} fullWidth />
          )}
          <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. against bill no 887" fullWidth multiline maxRows={3} />
          {error && <Typography sx={{ color: KHATA.red, fontSize: 14 }}>{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" disabled={!valid || saving} onClick={submit} sx={{ bgcolor: accent, minWidth: 140, '&:hover': { bgcolor: accent } }}>
          {saving ? 'Saving…' : gave ? 'Save payment' : 'Save receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
