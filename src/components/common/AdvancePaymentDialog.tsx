import { useEffect, useState } from 'react';
import {
  Alert,
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
import { useCreateSupplierPaymentMutation } from '@/api/financeApi';
import { formatCurrency } from '@/utils/format';
import type { PaymentMode } from '@/types/domain';

export interface AdvanceLotOption {
  lotId: string;
  lotNumber: string;
  itemName: string;
  weight: number;
  amount: number;
}

interface Props {
  open: boolean;
  supplierId: string;
  supplierName: string;
  /** Lots of the arrival the advance is paid against (first one preselected). */
  lots: AdvanceLotOption[];
  arrivalNumber?: string;
  onClose: () => void;
  onSaved?: (paymentNumber: string, amount: number) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Advance payment to a supplier against a specific lot — offered right after
 * an arrival is saved. The advance is a normal supplier payment tagged with
 * the lot; when that lot is settled it is adjusted on the bill automatically.
 */
export default function AdvancePaymentDialog({ open, supplierId, supplierName, lots, arrivalNumber, onClose, onSaved }: Props) {
  const [createPayment, { isLoading }] = useCreateSupplierPaymentMutation();
  const [lotId, setLotId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLotId(lots[0]?.lotId ?? '');
    setAmount('');
    setDate(today());
    setMode('cash');
    setReference('');
    setError(null);
  }, [open, lots]);

  const lot = lots.find((l) => l.lotId === lotId);
  const value = Number(amount);
  const valid = Boolean(lotId) && Number.isFinite(value) && value > 0;

  const save = async () => {
    if (!valid) return;
    setError(null);
    try {
      const p = await createPayment({
        supplierId, date, amount: Math.round(value * 100) / 100, paymentMode: mode, lotId,
        reference: reference.trim() || undefined,
        notes: `Advance against lot ${lot?.lotNumber ?? ''}${arrivalNumber ? ` (${arrivalNumber})` : ''}`,
      }).unwrap();
      onSaved?.(p.paymentNumber, p.amount);
      onClose();
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not record the advance.');
    }
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Advance payment
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
          {supplierName}{arrivalNumber ? ` · ${arrivalNumber}` : ''} · adjusted automatically when the lot is settled
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Against lot" value={lotId} onChange={(e) => setLotId(e.target.value)} fullWidth>
            {lots.map((l) => (
              <MenuItem key={l.lotId} value={l.lotId}>
                {l.lotNumber} · {l.itemName} · {l.weight} kg{l.amount > 0 ? ` · ${formatCurrency(l.amount, false)}` : ''}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            autoFocus label="Advance amount ₹" type="number" value={amount}
            onChange={(e) => setAmount(e.target.value.startsWith('-') ? '' : e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }} fullWidth
            helperText={lot && lot.amount > 0 && value > lot.amount ? `More than the lot value (${formatCurrency(lot.amount, false)})` : ' '}
          />
          <Stack direction="row" spacing={1.5}>
            <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} fullWidth>
              {(['cash', 'upi', 'bank'] as PaymentMode[]).map((m) => <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>)}
            </TextField>
          </Stack>
          {mode !== 'cash' && <TextField label="UTR / reference" value={reference} onChange={(e) => setReference(e.target.value)} fullWidth />}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>Skip</Button>
        <Button variant="contained" onClick={save} disabled={!valid || isLoading}>
          {isLoading ? 'Saving…' : 'Record advance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
