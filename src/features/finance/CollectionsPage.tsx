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
  DialogActions,
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
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useCreateCollectionMutation, useGetBankAccountsQuery, useGetCollectionsQuery, useGetCustomerOutstandingQuery } from '@/api/financeApi';
import { useGetOrganizationQuery } from '@/api/adminApi';
import { useLookups } from '@/utils/useLookups';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency } from '@/utils/format';
import { buildReceiptPdf, shareReceiptOnWhatsApp } from '@/utils/receipt';
import type { PaymentMode } from '@/types/domain';
import type { Collection } from '@/types/finance';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'credit', label: 'Credit/Adjustment' },
];
/** Modes whose money lands in a bank account rather than Cash in Hand. */
const isBankLinked = (m: PaymentMode) => m === 'upi' || m === 'bank';
const today = () => new Date().toISOString().slice(0, 10);

export default function CollectionsPage() {
  const { customers, customerName } = useLookups();
  const orgName = useAppSelector((s) => s.auth.user?.organizationName);
  const { data: org } = useGetOrganizationQuery();
  const mobileFor = (id: string) => customers.find((c) => c.id === id)?.mobile;
  const { data: collections } = useGetCollectionsQuery();
  const { data: outstanding } = useGetCustomerOutstandingQuery();
  const { data: bankAccounts } = useGetBankAccountsQuery();
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
  const [bankAccountId, setBankAccountId] = useState('');
  const [charges, setCharges] = useState('');
  const [reference, setReference] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Collection | null>(null);

  const bankLinked = isBankLinked(paymentMode);
  const activeBanks = useMemo(() => (bankAccounts ?? []).filter((b) => b.isActive), [bankAccounts]);
  const chargeNum = Number(charges) || 0;
  const netToBank = Math.max(0, (Number(amount) || 0) - chargeNum);
  const bankName = (id?: string | null) => (bankAccounts ?? []).find((b) => b.id === id)?.name;

  const canSave =
    Boolean(customerId) && Number(amount) > 0 && (!bankLinked || chargeNum < Number(amount));
  const selectedPending = customerId ? pendingFor(customerId) : 0;
  const recent = useMemo(() => (collections ?? []).slice(0, 20), [collections]);

  const company = {
    name: org?.name ?? orgName ?? 'Mandi ERP',
    address: org?.address,
    gstNumber: org?.gstNumber,
    mobile: org?.mobile,
    email: org?.email,
  };

  /** Short WhatsApp caption that accompanies the PDF receipt. */
  const receiptText = (c: Collection) => {
    const due = pendingFor(c.customerId);
    return [
      `*${company.name}*`,
      `Payment Receipt ${c.collectionNumber} · ${c.date}`,
      `Received from ${customerName(c.customerId)}`,
      '',
      `*Amount received: ${formatCurrency(c.amount, false)}*`,
      `Mode: ${c.paymentMode.toUpperCase()}`,
      ...(c.reference ? [`Reference: ${c.reference}`] : []),
      `Balance due: ${formatCurrency(due, false)}`,
      '',
      'Receipt PDF attached. Thank you! 🙏',
    ].join('\n');
  };

  /** Build a company-branded PDF receipt and share it (with the caption) on WhatsApp. */
  const shareReceipt = async (c: Collection) => {
    const due = pendingFor(c.customerId);
    const pdf = buildReceiptPdf({
      company,
      docTitle: 'PAYMENT RECEIPT',
      number: c.collectionNumber,
      date: c.date,
      partyLabel: 'Received from',
      partyName: customerName(c.customerId),
      fields: [
        { label: 'Amount received', value: formatCurrency(c.amount, false), strong: true },
        { label: 'Payment mode', value: c.paymentMode.toUpperCase() },
        ...(c.bankAccountId ? [{ label: 'Bank account', value: bankName(c.bankAccountId) ?? '—' }] : []),
        ...((c.charges ?? 0) > 0 ? [{ label: 'Bank charges', value: formatCurrency(c.charges ?? 0, false) }] : []),
        ...(c.reference ? [{ label: 'Reference', value: c.reference }] : []),
        { label: 'Balance due', value: formatCurrency(due, false) },
      ],
      note: 'This is a computer-generated receipt.',
    });
    const result = await shareReceiptOnWhatsApp(pdf, receiptText(c), mobileFor(c.customerId));
    if (result === 'downloaded') {
      setToast('Receipt PDF downloaded — attach it to the WhatsApp chat that just opened.');
    }
  };

  const save = async () => {
    setError(null);
    try {
      const res = await createCollection({
        date, customerId, amount: Number(amount), paymentMode,
        bankAccountId: bankLinked ? (bankAccountId || undefined) : undefined,
        charges: bankLinked ? chargeNum : undefined,
        reference: reference || undefined,
      }).unwrap();
      setToast(`${res.collectionNumber}: ${formatCurrency(res.amount, false)} received`);
      setAmount('');
      setCharges('');
      setReference('');
      // Surface the receipt so the user can share it on WhatsApp right away.
      setDetail(res);
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

              {/* Bank routing — only for bank-linked modes (UPI / Bank Transfer). */}
              {bankLinked && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select label="Bank account" value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    helperText={activeBanks.length === 0 ? 'No bank accounts yet — add one under Bank Accounts' : 'Where the money lands'}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="">— Not specified —</MenuItem>
                    {activeBanks.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{b.name}{b.bankName ? ` · ${b.bankName}` : ''}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Bank charges ₹" type="number" value={charges}
                    onChange={(e) => setCharges(e.target.value)} inputProps={{ inputMode: 'decimal' }}
                    error={Boolean(amount) && chargeNum >= Number(amount)}
                    helperText={chargeNum > 0 ? `Net to bank: ${formatCurrency(netToBank, false)}` : 'Fees deducted at source (optional)'}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              )}

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
                {detail.bankAccountId && <Row label="Bank account" value={bankName(detail.bankAccountId) ?? '—'} />}
                {(detail.charges ?? 0) > 0 && <Row label="Bank charges" value={formatCurrency(detail.charges ?? 0, false)} />}
                {(detail.charges ?? 0) > 0 && <Row label="Net to bank" value={formatCurrency(detail.amount - (detail.charges ?? 0), false)} />}
                {detail.reference && <Row label="Reference" value={detail.reference} />}
                {detail.notes && <Row label="Notes" value={detail.notes} />}
                <Divider />
                <Row label="Current due" value={formatCurrency(pendingFor(detail.customerId), false)} />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button onClick={() => setDetail(null)} color="inherit">Close</Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={() => shareReceipt(detail)}
              >
                Share receipt (PDF)
              </Button>
            </DialogActions>
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
