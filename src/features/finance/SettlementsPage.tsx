import { useMemo, useState } from 'react';
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
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  useCreateSupplierBillMutation,
  useCreateSupplierPaymentMutation,
  useGetSupplierBillsQuery,
  usePreviewSupplierBillMutation,
} from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import type { PaymentMode } from '@/types/domain';
import type { SupplierBill, SupplierBillPreview } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

export default function SettlementsPage() {
  const { suppliers, supplierName } = useLookups();
  const { data: bills } = useGetSupplierBillsQuery();
  const [preview, { isLoading: previewing }] = usePreviewSupplierBillMutation();
  const [createBill, { isLoading: creating }] = useCreateSupplierBillMutation();
  const [createPayment, { isLoading: paying }] = useCreateSupplierPaymentMutation();

  const [supplierId, setSupplierId] = useState('');
  const [fromDate, setFromDate] = useState(monthAgo());
  const [toDate, setToDate] = useState(today());
  const [previewData, setPreviewData] = useState<SupplierBillPreview | null>(null);
  const [labour, setLabour] = useState('0');
  const [crate, setCrate] = useState('0');
  const [other, setOther] = useState('0');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SupplierBill | null>(null);
  const [payBill, setPayBill] = useState<SupplierBill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('cash');

  const recent = useMemo(() => bills ?? [], [bills]);
  const netPayable = previewData
    ? previewData.net - Number(labour || 0) - Number(crate || 0) - Number(other || 0)
    : 0;

  const runPreview = async () => {
    setError(null);
    setPreviewData(null);
    try {
      const res = await preview({ supplierId, fromDate, toDate }).unwrap();
      setPreviewData(res);
    } catch {
      setError('Could not load supplier sales for this range.');
    }
  };

  const generate = async () => {
    setError(null);
    try {
      const bill = await createBill({
        supplierId, fromDate, toDate, date: today(),
        labourCharges: Number(labour || 0), crateCharges: Number(crate || 0), otherCharges: Number(other || 0),
      }).unwrap();
      setToast(`Bill ${bill.billNumber} · net payable ${formatCurrency(bill.netPayable, false)}`);
      setPreviewData(null);
      setLabour('0'); setCrate('0'); setOther('0');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not generate bill.');
    }
  };

  const openPay = (bill: SupplierBill) => {
    setDetail(null);
    setPayBill(bill);
    setPayAmount(String(bill.netPayable));
    setPayMode('cash');
  };
  const submitPay = async () => {
    if (!payBill) return;
    await createPayment({
      supplierId: payBill.supplierId, date: today(), amount: Number(payAmount), paymentMode: payMode, billId: payBill.id,
    }).unwrap();
    setToast(`Payment recorded for ${payBill.billNumber}`);
    setPayBill(null);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: { lg: 'stretch' }, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Bill form (left) ---- */}
      <Stack spacing={2} sx={{ flex: { lg: '0 1 760px' }, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Supplier Settlement</Typography>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TextField select label="Supplier" value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPreviewData(null); }}>
                {suppliers.filter((s) => s.isActive).map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}{s.village ? ` · ${s.village}` : ''}</MenuItem>
                ))}
              </TextField>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Stack>
              <Button variant="outlined" onClick={runPreview} disabled={!supplierId || previewing}>
                {previewing ? 'Loading…' : 'Preview sales'}
              </Button>

              {previewData && (
                <>
                  <Divider />
                  <Stack spacing={0.5}>
                    <Row label={`Gross sales (${previewData.saleLineCount} lines)`} value={previewData.gross} />
                    <Row label="− Commission" value={-previewData.commission} />
                    <Row label="− Market fee" value={-previewData.marketFee} />
                    <Row label="Sales net" value={previewData.net} bold />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Settlement deductions</Typography>
                  <Stack direction="row" spacing={1.5}>
                    <TextField size="small" label="Labour ₹" type="number" value={labour} onChange={(e) => setLabour(e.target.value)} />
                    <TextField size="small" label="Crate ₹" type="number" value={crate} onChange={(e) => setCrate(e.target.value)} />
                    <TextField size="small" label="Other ₹" type="number" value={other} onChange={(e) => setOther(e.target.value)} />
                  </Stack>
                  <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'success.main', color: '#fff', borderRadius: 2, px: 2, py: 1.5 }}>
                    <Typography sx={{ flexGrow: 1, fontWeight: 700 }}>Net payable</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{formatCurrency(netPayable, false)}</Typography>
                  </Box>
                  {error && <Alert severity="error">{error}</Alert>}
                  <Button variant="contained" onClick={generate} disabled={creating || previewData.saleLineCount === 0}>
                    {creating ? 'Generating…' : 'Generate Settlement Bill'}
                  </Button>
                  {previewData.saleLineCount === 0 && (
                    <Alert severity="info">No lot-linked sales for this supplier in the selected range.</Alert>
                  )}
                </>
              )}
              {error && !previewData && <Alert severity="error">{error}</Alert>}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* ---- Divider between form and recent activity ---- */}
      <Divider orientation="vertical" flexItem sx={{ ml: { lg: 'auto' }, mr: { lg: 3 }, display: { xs: 'none', lg: 'block' } }} />

      {/* ---- Settlement bills (far right) ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <HistoryRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>Settlement bills</Typography>
                <Chip size="small" label={recent.length} />
              </Stack>
              {recent.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No bills generated yet. Generated bills show here.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: { lg: 'calc(100dvh - 180px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 } }}>
                  {recent.map((b) => (
                    <Card key={b.id} variant="outlined">
                      <CardContent sx={{ py: '10px !important' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box onClick={() => setDetail(b)} sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ fontWeight: 700 }} noWrap>{supplierName(b.supplierId)}</Typography>
                              <Chip size="small" label={b.status} color={b.status === 'paid' ? 'success' : 'warning'} sx={{ height: 18, fontSize: '0.6rem' }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                              {b.billNumber} · {b.fromDate}→{b.toDate}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontWeight: 800 }}>{formatCurrency(b.netPayable)}</Typography>
                            {b.status !== 'paid'
                              ? <Button size="small" onClick={() => openPay(b)}>Pay</Button>
                              : <IconButton size="small" onClick={() => setDetail(b)}><ChevronRightRoundedIcon fontSize="small" /></IconButton>}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* ---- Bill detail dialog ---- */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="xs">
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                {supplierName(detail.supplierId)}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
                  {detail.billNumber} · {detail.fromDate}→{detail.toDate}
                </Typography>
              </Box>
              <Chip size="small" label={detail.status} color={detail.status === 'paid' ? 'success' : 'warning'} />
              <IconButton onClick={() => setDetail(null)} size="small"><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={0.5}>
                <Row label="Gross sales" value={detail.grossSales} />
                <Row label="− Commission" value={-detail.commissionAmount} />
                <Row label="− Market fee" value={-detail.marketFeeAmount} />
                <Row label="− Labour" value={-detail.labourCharges} />
                <Row label="− Crate" value={-detail.crateCharges} />
                <Row label="− Other" value={-detail.otherCharges} />
                <Divider sx={{ my: 1 }} />
                <Row label="Net payable" value={detail.netPayable} bold />
              </Stack>
            </DialogContent>
            {detail.status !== 'paid' && (
              <DialogActions sx={{ p: 2 }}>
                <Button variant="contained" onClick={() => openPay(detail)}>Record Payment</Button>
              </DialogActions>
            )}
          </>
        )}
      </Dialog>

      {/* ---- Pay dialog ---- */}
      <Dialog open={Boolean(payBill)} onClose={() => setPayBill(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Pay supplier</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Amount ₹" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <TextField select label="Mode" value={payMode} onChange={(e) => setPayMode(e.target.value as PaymentMode)}>
              {(['cash', 'upi', 'bank'] as PaymentMode[]).map((m) => <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPayBill(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitPay} disabled={!(Number(payAmount) > 0) || paying}>Record Payment</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600 }}>{formatCurrency(value, false)}</Typography>
    </Stack>
  );
}
