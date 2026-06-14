import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useCreateCollectionMutation, useGetCollectionsQuery, useGetCustomerOutstandingQuery } from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import type { PaymentMode } from '@/types/domain';
import type { Collection } from '@/types/finance';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'Credit/Adjustment' },
];
const today = () => new Date().toISOString().slice(0, 10);

export default function CollectionsPage() {
  const { customers, customerName } = useLookups();
  const { data: collections } = useGetCollectionsQuery();
  const { data: outstanding } = useGetCustomerOutstandingQuery();
  const [createCollection, { isLoading: saving }] = useCreateCollectionMutation();

  // Pending receivable per customer (opening + sales − collected).
  const pendingMap = useMemo(
    () => new Map((outstanding ?? []).map((r) => [r.customerId, r.balance])),
    [outstanding],
  );
  const pendingFor = (id: string) => pendingMap.get(id) ?? 0;

  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [reference, setReference] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Collection | null>(null);

  const canSave = customerId && Number(amount) > 0;
  const selectedPending = customerId ? pendingFor(customerId) : 0;
  const recent = useMemo(() => (collections ?? []).slice(0, 20), [collections]);

  const save = async () => {
    setError(null);
    try {
      const res = await createCollection({
        date, customerId, amount: Number(amount), paymentMode, reference: reference || undefined,
      }).unwrap();
      setToast(`${res.collectionNumber}: ${formatCurrency(res.amount, false)} received`);
      setAmount('');
      setReference('');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save collection.');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: { lg: 'stretch' }, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Entry form (left) ---- */}
      <Stack spacing={2} sx={{ flex: { lg: '0 1 760px' }, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Ugrahi · Collections</Typography>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TextField select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.filter((c) => c.isActive).map((c) => {
                  const due = pendingFor(c.id);
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
                  const c = selectedPending > 0 ? theme.palette.warning.main : theme.palette.success.main;
                  return {
                    display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                    p: 1.5, borderRadius: 2,
                    bgcolor: alpha(c, 0.1), border: `1px solid ${alpha(c, 0.35)}`,
                  };
                }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">Pending amount</Typography>
                    <Typography sx={{ fontWeight: 800, color: selectedPending > 0 ? 'warning.dark' : 'success.dark', lineHeight: 1.1 }}>
                      {formatCurrency(selectedPending, false)}
                    </Typography>
                  </Box>
                  {selectedPending > 0 && (
                    <Button size="small" variant="outlined" onClick={() => setAmount(String(selectedPending))}>
                      Pay full
                    </Button>
                  )}
                </Box>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Amount ₹" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
                <TextField select label="Mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                  {PAYMENT_MODES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </TextField>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
              </Stack>
              {error && <Alert severity="error">{error}</Alert>}
              <Button size="large" variant="contained" startIcon={<PaymentsRoundedIcon />} onClick={save} disabled={!canSave || saving}>
                {saving ? 'Saving…' : 'Record Collection'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* ---- Divider between form and recent activity ---- */}
      <Divider orientation="vertical" flexItem sx={{ ml: { lg: 'auto' }, mr: { lg: 3 }, display: { xs: 'none', lg: 'block' } }} />

      {/* ---- Recent collections (far right) ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <HistoryRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>Recent collections</Typography>
                <Chip size="small" label={(collections ?? []).length} />
              </Stack>
              {recent.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No collections yet. Saved receipts show here.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: { lg: 'calc(100dvh - 180px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 } }}>
                  {recent.map((c) => (
                    <Card key={c.id} variant="outlined">
                      <CardActionArea onClick={() => setDetail(c)} sx={{ p: 1.25 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700 }} noWrap>{customerName(c.customerId)}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                              {c.collectionNumber} · {c.date} · {c.paymentMode}{c.reference ? ` · ${c.reference}` : ''}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontWeight: 800, color: 'success.main' }}>{formatCurrency(c.amount)}</Typography>
                          <ChevronRightRoundedIcon color="action" fontSize="small" />
                        </Stack>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* ---- Detail dialog ---- */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="xs">
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                {customerName(detail.customerId)}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
                  {detail.collectionNumber} · {detail.date}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetail(null)} size="small"><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.25}>
                <Row label="Amount received" value={formatCurrency(detail.amount, false)} strong />
                <Row label="Payment mode" value={detail.paymentMode} />
                {detail.reference && <Row label="Reference" value={detail.reference} />}
                {detail.notes && <Row label="Notes" value={detail.notes} />}
                <Divider />
                <Row label="Current due" value={formatCurrency(pendingFor(detail.customerId), false)} />
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: strong ? 800 : 600, textTransform: label === 'Payment mode' ? 'capitalize' : 'none' }}>{value}</Typography>
    </Stack>
  );
}
