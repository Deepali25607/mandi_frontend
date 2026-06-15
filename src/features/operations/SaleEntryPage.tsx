import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { alpha } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useGetCustomersQuery, useGetItemsQuery } from '@/api/mastersApi';
import { useCreateSaleMutation, useGetStockLotsQuery } from '@/api/operationsApi';
import { useGetCustomerOutstandingQuery } from '@/api/financeApi';
import { formatCurrency } from '@/utils/format';
import type { PaymentMode, StockLot } from '@/types/domain';

interface LineDraft {
  itemId: string;
  lotId: string;
  quantity: string;
  weight: string;
  rate: string;
  commissionPct: string;
  marketFeePct: string;
}

const emptyLine = (): LineDraft => ({
  itemId: '',
  lotId: '',
  quantity: '',
  weight: '',
  rate: '',
  commissionPct: '',
  marketFeePct: '',
});
const today = () => new Date().toISOString().slice(0, 10);

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'credit', label: 'Credit' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
];

function compute(l: LineDraft) {
  const base = Number(l.weight) > 0 ? Number(l.weight) : Number(l.quantity) || 0;
  const gross = base * (Number(l.rate) || 0);
  const commission = (gross * (Number(l.commissionPct) || 0)) / 100;
  const marketFee = (gross * (Number(l.marketFeePct) || 0)) / 100;
  const net = gross - commission - marketFee;
  return { gross, commission, marketFee, net };
}

export default function SaleEntryPage() {
  const { data: items } = useGetItemsQuery();
  const { data: customers } = useGetCustomersQuery();
  const { data: lots } = useGetStockLotsQuery({ availableOnly: true });
  const { data: outstanding } = useGetCustomerOutstandingQuery();
  const [createSale, { isLoading }] = useCreateSaleMutation();

  const pendingMap = useMemo(
    () => new Map((outstanding ?? []).map((r) => [r.customerId, r.balance])),
    [outstanding],
  );

  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('credit');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeItems = (items ?? []).filter((i) => i.isActive);
  const activeCustomers = (customers ?? []).filter((c) => c.isActive);

  const lotsByItem = useMemo(() => {
    const m = new Map<string, StockLot[]>();
    for (const lot of lots ?? []) {
      if (!m.has(lot.itemId)) m.set(lot.itemId, []);
      m.get(lot.itemId)!.push(lot);
    }
    return m;
  }, [lots]);

  const totals = lines.reduce(
    (acc, l) => {
      const c = compute(l);
      acc.gross += c.gross;
      acc.commission += c.commission;
      acc.marketFee += c.marketFee;
      acc.net += c.net;
      return acc;
    },
    { gross: 0, commission: 0, marketFee: 0, net: 0 },
  );

  const updateLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  // Selecting an item auto-fills commission/fee defaults and picks the first lot.
  const onSelectItem = (idx: number, itemId: string) => {
    const item = activeItems.find((i) => i.id === itemId);
    const itemLots = lotsByItem.get(itemId) ?? [];
    updateLine(idx, {
      itemId,
      lotId: itemLots[0]?.id ?? '',
      commissionPct: item ? String(item.defaultCommissionPct) : '',
      marketFeePct: item ? String(item.defaultMarketFeePct) : '',
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validLines = lines.filter(
    (l) => l.itemId && (Number(l.weight) > 0 || Number(l.quantity) > 0) && Number(l.rate) > 0,
  );
  const canSave = Boolean(customerId) && validLines.length > 0;
  const selectedPending = customerId ? pendingMap.get(customerId) ?? 0 : 0;

  const save = async () => {
    setError(null);
    try {
      const sale = await createSale({
        date,
        customerId,
        paymentMode,
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          lotId: l.lotId || undefined,
          quantity: Number(l.quantity) || 0,
          weight: Number(l.weight) || 0,
          rate: Number(l.rate),
          // Send exactly what the form shows: a blank field means 0 (the item
          // default only pre-fills the input; clearing it = no charge), so the
          // saved sale and the settlement match the on-screen figures.
          commissionPct: l.commissionPct === '' ? 0 : Number(l.commissionPct),
          marketFeePct: l.marketFeePct === '' ? 0 : Number(l.marketFeePct),
        })),
      }).unwrap();
      setToast(`Sale ${sale.saleNumber} saved · billed ${formatCurrency(sale.grossAmount, false)}`);
      setCustomerId('');
      setLines([emptyLine()]);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save sale.');
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Daily Sale Entry</Typography>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {activeCustomers.length === 0 && <MenuItem disabled value="">No customers — add one first</MenuItem>}
              {activeCustomers.map((c) => {
                const due = pendingMap.get(c.id) ?? 0;
                return (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{c.name}{c.area ? ` · ${c.area}` : ''}</Box>
                      {due > 0 && <Chip size="small" color="warning" label={`Due ${formatCurrency(due, false)}`} sx={{ height: 20 }} />}
                    </Box>
                  </MenuItem>
                );
              })}
            </TextField>

            {customerId && (
              <Box sx={(theme) => {
                const col = selectedPending > 0 ? theme.palette.warning.main : theme.palette.success.main;
                return {
                  display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                  p: 1.5, borderRadius: 2, bgcolor: alpha(col, 0.1), border: `1px solid ${alpha(col, 0.35)}`,
                };
              }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary">Current due (outstanding)</Typography>
                  <Typography sx={{ fontWeight: 800, color: selectedPending > 0 ? 'warning.dark' : 'success.dark', lineHeight: 1.1 }}>
                    {formatCurrency(selectedPending, false)}
                  </Typography>
                </Box>
                {totals.gross > 0 && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">After this sale</Typography>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>{formatCurrency(selectedPending + totals.gross, false)}</Typography>
                  </Box>
                )}
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField select label="Payment" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                {PAYMENT_MODES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        {lines.map((line, idx) => {
          const c = compute(line);
          const itemLots = line.itemId ? lotsByItem.get(line.itemId) ?? [] : [];
          const selectedLot = itemLots.find((l) => l.id === line.lotId);
          const overdraw = selectedLot && Number(line.weight) > selectedLot.weightAvailable + 0.001;
          return (
            <Card key={idx}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ flexGrow: 1, color: 'text.secondary' }}>Item {idx + 1}</Typography>
                    <Chip size="small" label={`Bill ${formatCurrency(c.gross, false)}`} color="primary" sx={{ fontWeight: 700 }} />
                    <IconButton size="small" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField select fullWidth size="small" label="Item" value={line.itemId} onChange={(e) => onSelectItem(idx, e.target.value)}>
                        {activeItems.map((it) => (
                          <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select fullWidth size="small" label="Lot (stock)"
                        value={line.lotId}
                        onChange={(e) => updateLine(idx, { lotId: e.target.value })}
                        disabled={!line.itemId}
                        helperText={selectedLot ? `${selectedLot.weightAvailable} kg available @ ${formatCurrency(selectedLot.rate, false)}` : 'No lot linked'}
                      >
                        <MenuItem value="">No specific lot</MenuItem>
                        {itemLots.map((lot) => (
                          <MenuItem key={lot.id} value={lot.id}>{lot.lotNumber} · {lot.weightAvailable}kg</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={4}>
                      <TextField fullWidth size="small" label="Qty" type="number" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                    </Grid>
                    <Grid size={4}>
                      <TextField
                        fullWidth size="small" label="Weight (kg)" type="number"
                        value={line.weight}
                        onChange={(e) => updateLine(idx, { weight: e.target.value })}
                        error={overdraw}
                        helperText={overdraw ? 'Exceeds stock' : ' '}
                        inputProps={{ inputMode: 'decimal' }}
                      />
                    </Grid>
                    <Grid size={4}>
                      <TextField fullWidth size="small" label="Rate ₹" type="number" value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                    </Grid>
                    <Grid size={6}>
                      <TextField fullWidth size="small" label="Commission %" type="number" value={line.commissionPct} onChange={(e) => updateLine(idx, { commissionPct: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                    </Grid>
                    <Grid size={6}>
                      <TextField fullWidth size="small" label="Market fee %" type="number" value={line.marketFeePct} onChange={(e) => updateLine(idx, { marketFeePct: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
                    <Typography variant="caption">Comm {formatCurrency(c.commission, false)}</Typography>
                    <Typography variant="caption">Fee {formatCurrency(c.marketFee, false)}</Typography>
                    <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 700, color: 'success.main' }}>
                      Supplier net {formatCurrency(c.net, false)}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
        <Button startIcon={<AddRoundedIcon />} onClick={addLine} variant="outlined">
          Add another item
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ position: 'sticky', bottom: 8 }}>
        <CardContent>
          <Grid container spacing={1} sx={{ mb: 1.5 }}>
            <Total label="Customer bill" value={totals.gross} bold />
            <Total label="Commission" value={totals.commission} />
            <Total label="Market fee" value={totals.marketFee} />
            <Total label="Supplier net" value={totals.net} color="success.main" />
          </Grid>
          <Button fullWidth size="large" variant="contained" onClick={save} disabled={!canSave || isLoading}>
            {isLoading ? 'Saving…' : 'Save Sale'}
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

function Total({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Grid size={6}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: bold ? 800 : 700, color }}>
        {formatCurrency(value, false)}
      </Typography>
    </Grid>
  );
}
