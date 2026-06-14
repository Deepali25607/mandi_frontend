import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useCreateAdjustmentMutation, useGetAdjustmentsQuery } from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import type { AdjustmentType } from '@/types/finance';

const TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'rate_increase', label: 'Rate increase' },
  { value: 'rate_decrease', label: 'Rate decrease' },
  { value: 'weight_increase', label: 'Weight increase' },
  { value: 'weight_decrease', label: 'Weight decrease' },
];
const today = () => new Date().toISOString().slice(0, 10);

export default function AdjustmentsPage() {
  const { suppliers, supplierName } = useLookups();
  const { data: adjustments } = useGetAdjustmentsQuery();
  const [create, { isLoading }] = useCreateAdjustmentMutation();

  const [date, setDate] = useState(today());
  const [supplierId, setSupplierId] = useState('');
  const [type, setType] = useState<AdjustmentType>('rate_increase');
  const [actualValue, setActualValue] = useState('');
  const [reportedValue, setReportedValue] = useState('');
  const [converter, setConverter] = useState(''); // rate (for weight adj.) or weight (for rate adj.)
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The fields mean different things depending on the adjustment type.
  const isWeight = type.startsWith('weight');
  const isIncrease = type.endsWith('increase');
  const valueNoun = isWeight ? 'weight' : 'rate';
  const valueUnit = isWeight ? 'kg' : '₹/kg';
  const converterLabel = isWeight ? 'Rate (₹/kg)' : 'Weight (kg)';

  // Effect on payable is derived from the gap × the converting figure, and signed
  // by the selected option: an *increase* adds to the supplier's payable, a
  // *decrease* reduces it. Weight gap is valued with the rate; rate gap with the weight.
  const gap = Math.abs((Number(reportedValue) || 0) - (Number(actualValue) || 0));
  const autoAmount = Math.round((isIncrease ? 1 : -1) * gap * (Number(converter) || 0) * 100) / 100;
  const effectiveAmount = amountTouched ? Number(amount) : autoAmount;

  const onTypeChange = (next: AdjustmentType) => {
    setType(next);
    // Field meanings change with the category, so clear to avoid mixing units.
    setActualValue(''); setReportedValue(''); setConverter('');
    setAmount(''); setAmountTouched(false);
  };

  const save = async () => {
    setError(null);
    try {
      const res = await create({
        date, supplierId, type,
        actualValue: Number(actualValue) || 0,
        reportedValue: Number(reportedValue) || 0,
        amount: effectiveAmount,
        notes: notes || undefined,
      }).unwrap();
      setToast(`${res.adjustmentNumber}: ${formatCurrency(res.amount, false)} effect`);
      setActualValue(''); setReportedValue(''); setConverter(''); setAmount(''); setAmountTouched(false); setNotes('');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save adjustment.');
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Rate &amp; Weight Adjustment</Typography>
      <Typography variant="body2" color="text.secondary">
        Records the difference between the actual sale and the figure reported to the supplier.
        A positive amount increases the supplier's payable. Customer bills are unaffected.
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField select label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.filter((s) => s.isActive).map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}{s.village ? ` · ${s.village}` : ''}</MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Type" value={type} onChange={(e) => onTypeChange(e.target.value as AdjustmentType)} fullWidth>
                {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label={`Actual ${valueNoun} (${valueUnit})`} type="number" value={actualValue} onChange={(e) => setActualValue(e.target.value)} inputProps={{ inputMode: 'decimal' }} fullWidth />
              <TextField label={`Reported ${valueNoun} (${valueUnit})`} type="number" value={reportedValue} onChange={(e) => setReportedValue(e.target.value)} inputProps={{ inputMode: 'decimal' }} fullWidth />
            </Stack>
            <TextField
              label={converterLabel}
              type="number"
              value={converter}
              onChange={(e) => setConverter(e.target.value)}
              helperText={isWeight ? 'Rate used to value the weight difference.' : 'Weight used to value the rate difference.'}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              label="Effect on payable ₹"
              type="number"
              value={amountTouched ? amount : String(autoAmount)}
              onChange={(e) => { setAmountTouched(true); setAmount(e.target.value); }}
              helperText={`Auto = |Reported − Actual| ${valueNoun} × ${isWeight ? 'rate' : 'weight'}, ${isIncrease ? 'added to' : 'subtracted from'} the supplier's payable (${isIncrease ? '+' : '−'}).`}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {error && <Alert severity="error">{error}</Alert>}
            <Button size="large" variant="contained" startIcon={<TuneRoundedIcon />} onClick={save} disabled={!supplierId || isLoading}>
              {isLoading ? 'Saving…' : 'Record Adjustment'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Recent adjustments</Typography>
      {!adjustments || adjustments.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>No adjustments recorded yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {adjustments.map((a) => (
            <Card key={a.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '12px !important' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 700 }} noWrap>{supplierName(a.supplierId)}</Typography>
                    <Chip size="small" label={a.type.replace('_', ' ')} sx={{ height: 18, fontSize: '0.62rem', textTransform: 'capitalize' }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{a.adjustmentNumber} · {a.date} · actual {formatCurrency(a.actualValue, false)} → reported {formatCurrency(a.reportedValue, false)}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, color: a.amount >= 0 ? 'error.main' : 'success.main' }}>
                  {a.amount >= 0 ? '+' : ''}{formatCurrency(a.amount, false)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
