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
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useCreateExpenseMutation, useGetExpensesQuery } from '@/api/financeApi';
import { formatCurrency } from '@/utils/format';
import type { PaymentMode } from '@/types/domain';
import type { Expense, ExpenseCategory } from '@/types/finance';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'labour', label: 'Labour' },
  { value: 'transport', label: 'Transport' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'rent', label: 'Rent' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];
const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'bank'];
const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesPage() {
  const { data: expenses } = useGetExpensesQuery();
  const [createExpense, { isLoading: saving }] = useCreateExpenseMutation();

  const [date, setDate] = useState(today());
  const [category, setCategory] = useState<ExpenseCategory>('labour');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Expense | null>(null);

  const total = (expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const recent = useMemo(() => (expenses ?? []).slice(0, 20), [expenses]);

  const save = async () => {
    setError(null);
    try {
      const res = await createExpense({ date, category, amount: Number(amount), paymentMode, notes: notes || undefined }).unwrap();
      setToast(`${res.expenseNumber}: ${formatCurrency(res.amount, false)}`);
      setAmount('');
      setNotes('');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save expense.');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: { lg: 'stretch' }, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Entry form (left) ---- */}
      <Stack spacing={2} sx={{ flex: { lg: '0 1 760px' }, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Expenses</Typography>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                  {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </TextField>
                <TextField label="Amount ₹" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField select label="Mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                  {PAYMENT_MODES.map((p) => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
                </TextField>
              </Stack>
              <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              {error && <Alert severity="error">{error}</Alert>}
              <Button size="large" variant="contained" startIcon={<ReceiptLongRoundedIcon />} onClick={save} disabled={!(Number(amount) > 0) || saving}>
                {saving ? 'Saving…' : 'Add Expense'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* ---- Divider between form and recent activity ---- */}
      <Divider orientation="vertical" flexItem sx={{ ml: { lg: 'auto' }, mr: { lg: 3 }, display: { xs: 'none', lg: 'block' } }} />

      {/* ---- Recent expenses (far right) ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <HistoryRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>Recent expenses</Typography>
                <Chip size="small" label={(expenses ?? []).length} />
              </Stack>
              {recent.length > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1, px: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main' }}>{formatCurrency(total, false)}</Typography>
                </Stack>
              )}
              {recent.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No expenses yet. Saved expenses show here.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: { lg: 'calc(100dvh - 200px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 } }}>
                  {recent.map((e) => (
                    <Card key={e.id} variant="outlined">
                      <CardActionArea onClick={() => setDetail(e)} sx={{ p: 1.25 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }} noWrap>{e.category}</Typography>
                              <Chip size="small" label={e.paymentMode} sx={{ height: 18, fontSize: '0.6rem' }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                              {e.expenseNumber} · {e.date}{e.notes ? ` · ${e.notes}` : ''}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontWeight: 800, color: 'error.main' }}>{formatCurrency(e.amount)}</Typography>
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
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'capitalize' }}>
              <Box sx={{ flexGrow: 1 }}>
                {detail.category}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400, textTransform: 'none' }}>
                  {detail.expenseNumber} · {detail.date}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetail(null)} size="small"><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.25}>
                <Row label="Amount" value={formatCurrency(detail.amount, false)} strong />
                <Row label="Payment mode" value={detail.paymentMode} cap />
                {detail.notes && <Row label="Notes" value={detail.notes} />}
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

function Row({ label, value, strong, cap }: { label: string; value: string; strong?: boolean; cap?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: strong ? 800 : 600, textTransform: cap ? 'capitalize' : 'none' }}>{value}</Typography>
    </Stack>
  );
}
