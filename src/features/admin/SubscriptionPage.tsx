import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { alpha } from '@mui/material/styles';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import {
  useGetMySubscriptionQuery,
  useRequestSubscriptionPaymentMutation,
} from '@/api/subscriptionApi';
import { formatCurrency } from '@/utils/format';
import type {
  BillingCycle,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from '@/types/subscription';

const METHODS: { value: SubscriptionPaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLOR: Record<SubscriptionPaymentStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export default function SubscriptionPage() {
  const { data, isLoading, isError, refetch } = useGetMySubscriptionQuery();
  const [requestPayment, { isLoading: submitting }] = useRequestSubscriptionPaymentMutation();

  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SubscriptionPaymentMethod>('upi');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pending = useMemo(
    () => (data?.payments ?? []).find((p) => p.status === 'pending'),
    [data],
  );

  // Default the amount to the plan price for the chosen cycle (user can override).
  const priceForCycle = cycle === 'yearly' ? data?.priceYearly ?? 0 : data?.priceMonthly ?? 0;
  const effectiveAmount = amount === '' ? priceForCycle : Number(amount);

  const copy = (text?: string | null) => {
    if (text) navigator.clipboard?.writeText(text).then(() => setToast('Copied'));
  };

  const submit = async () => {
    setError(null);
    try {
      await requestPayment({
        amount: effectiveAmount,
        billingCycle: cycle,
        method,
        reference: reference || undefined,
        note: note || undefined,
      }).unwrap();
      setToast('Payment submitted — awaiting verification by the platform team.');
      setAmount('');
      setReference('');
      setNote('');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not submit payment.');
    }
  };

  if (isLoading) {
    return <Typography color="text.secondary">Loading subscription…</Typography>;
  }
  if (isError || !data) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', mt: 4 }}>
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}
        >
          Could not load your subscription. If the server was just updated, restart the backend and try again.
        </Alert>
      </Stack>
    );
  }

  const status = data.status ?? 'trial';
  const expired = data.locked;
  const trialEndingSoon = status === 'trial' && !expired && (data.daysLeft ?? 99) <= 3;

  return (
    <Stack spacing={2} sx={{ maxWidth: 880, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <WorkspacePremiumRoundedIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Subscription &amp; Billing</Typography>
      </Stack>

      {expired && (
        <Alert severity="error" variant="filled">
          Your {status === 'trial' ? 'free trial' : 'subscription'} has ended. The app is
          <strong> read-only</strong> until a payment is confirmed. Submit your payment below to
          restore full access.
        </Alert>
      )}
      {trialEndingSoon && (
        <Alert severity="warning">
          Your free trial ends in <strong>{data.daysLeft} day{data.daysLeft === 1 ? '' : 's'}</strong>.
          Subscribe now to avoid interruption.
        </Alert>
      )}

      {/* Current plan / status */}
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Summary label="Plan" value={data.planName ?? 'Unassigned'} />
            <Summary
              label="Status"
              value={
                <Chip
                  size="small"
                  color={status === 'active' ? 'success' : status === 'trial' ? 'info' : 'default'}
                  label={status}
                  sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                />
              }
            />
            <Summary label={expired ? 'Expired on' : 'Renews / expires on'} value={data.renewalDate ?? '—'} />
            <Summary
              label="Time left"
              value={
                data.daysLeft == null
                  ? '—'
                  : data.daysLeft < 0
                    ? `Expired ${Math.abs(data.daysLeft)}d ago`
                    : `${data.daysLeft} day${data.daysLeft === 1 ? '' : 's'}`
              }
            />
          </Grid>
        </CardContent>
      </Card>

      {/* How to pay */}
      <Card sx={(t) => ({ bgcolor: alpha(t.palette.primary.main, 0.05) })}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>How to pay</Typography>
          {data.paymentInstructions && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {data.paymentInstructions}
            </Typography>
          )}
          <Stack spacing={1}>
            {data.paymentUpi && <PayLine label="UPI ID" value={data.paymentUpi} onCopy={copy} />}
            {data.paymentBank && <PayLine label="Bank" value={data.paymentBank} onCopy={copy} />}
            <Stack direction="row" spacing={3} sx={{ pt: 0.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Monthly</Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatCurrency(data.priceMonthly)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Yearly</Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatCurrency(data.priceYearly)}</Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Submit payment */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Submit a payment</Typography>
          {pending ? (
            <Alert severity="info">
              A payment of <strong>{formatCurrency(pending.amount)}</strong> submitted on{' '}
              {new Date(pending.createdAt).toLocaleDateString()} is awaiting verification. You'll get
              full access once the platform team approves it.
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth label="Billing cycle" value={cycle}
                  onChange={(e) => { setCycle(e.target.value as BillingCycle); setAmount(''); }}
                >
                  <MenuItem value="monthly">Monthly — {formatCurrency(data.priceMonthly)}</MenuItem>
                  <MenuItem value="yearly">Yearly — {formatCurrency(data.priceYearly)}</MenuItem>
                </TextField>
                <TextField
                  fullWidth label="Amount paid (₹)" type="number" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(priceForCycle)}
                  inputProps={{ inputMode: 'decimal', min: 0 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select fullWidth label="Method" value={method}
                  onChange={(e) => setMethod(e.target.value as SubscriptionPaymentMethod)}
                >
                  {METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
                <TextField
                  fullWidth label="Reference (UPI txn / UTR / cheque no.)" value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Stack>
              <TextField
                label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
                multiline minRows={2}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Box>
                <Button
                  variant="contained" size="large" onClick={submit}
                  disabled={submitting || effectiveAmount <= 0}
                >
                  {submitting ? 'Submitting…' : `Submit payment of ${formatCurrency(effectiveAmount)}`}
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {data.payments.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Payment history</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cycle</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{p.billingCycle}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {p.reference || '—'}
                        {p.status === 'rejected' && p.reviewNote && (
                          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                            {p.reviewNote}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={STATUS_COLOR[p.status]} label={p.status} sx={{ textTransform: 'capitalize' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      )}

      {(data.supportEmail || data.supportMobile) && (
        <>
          <Divider />
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Need help? Contact {data.supportEmail}{data.supportEmail && data.supportMobile ? ' · ' : ''}{data.supportMobile}
          </Typography>
        </>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Grid size={{ xs: 6, sm: 3 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography component="div" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Grid>
  );
}

function PayLine({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 56 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1, wordBreak: 'break-word' }}>{value}</Typography>
      <Button size="small" startIcon={<ContentCopyRoundedIcon fontSize="small" />} onClick={() => onCopy(value)}>
        Copy
      </Button>
    </Stack>
  );
}
