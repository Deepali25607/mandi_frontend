import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { useGetSalesQuery, useDeleteSaleMutation } from '@/api/operationsApi';
import { useGetCustomersQuery } from '@/api/mastersApi';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency } from '@/utils/format';
import { saleBill, type PaymentStatus } from '@/utils/saleBill';
import SaleInvoiceDialog from '@/components/sales/SaleInvoiceDialog';
import { useInvoiceOutput } from '@/components/sales/useInvoiceOutput';
import PrintMenu from '@/components/common/PrintMenu';
import ThermalPrintDialog from '@/components/common/ThermalPrintDialog';
import type { PaymentMode, Sale } from '@/types/domain';

// ---- Local date helpers (device-local YYYY-MM-DD) ----
const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
type QuickRange = 'today' | 'yesterday' | 'week' | 'month' | 'prevMonth' | 'all';
function rangeFor(q: QuickRange): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (q) {
    case 'today':
      return { from: iso(start), to: iso(start) };
    case 'yesterday': {
      const y = new Date(start);
      y.setDate(y.getDate() - 1);
      return { from: iso(y), to: iso(y) };
    }
    case 'week': {
      // Week starts Monday.
      const d = new Date(start);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return { from: iso(d), to: iso(start) };
    }
    case 'month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(start) };
    case 'prevMonth':
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

interface Filters {
  from: string;
  to: string;
  customerId: string;
  billNumber: string;
  paymentType: '' | PaymentMode;
  paymentStatus: '' | PaymentStatus;
  minAmount: string;
  maxAmount: string;
}
const EMPTY: Filters = {
  from: '', to: '', customerId: '', billNumber: '', paymentType: '', paymentStatus: '', minAmount: '', maxAmount: '',
};

const PAYMENT_TYPES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
];
const QUICK: { value: QuickRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'prevMonth', label: 'Previous Month' },
  { value: 'all', label: 'All Records' },
];

export default function AllSalesPage() {
  const navigate = useNavigate();
  const { data: sales, isLoading } = useGetSalesQuery({ all: true });
  const { data: customers } = useGetCustomersQuery();
  const [deleteSale, { isLoading: deleting }] = useDeleteSaleMutation();
  const isAdmin = useAppSelector((s) => s.auth.user?.role) === 'org_admin';
  const { output, thermalDoc, setThermalDoc } = useInvoiceOutput();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [quick, setQuick] = useState<QuickRange | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [viewing, setViewing] = useState<Sale | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ sale: Sale; customer: string } | null>(null);
  const [printFor, setPrintFor] = useState<{ sale: Sale; anchor: HTMLElement } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customerName = (id: string) => (customers ?? []).find((c) => c.id === id)?.name ?? 'Customer';
  const activeCustomers = (customers ?? []).filter((c) => c.isActive);

  const setField = (patch: Partial<Filters>) => setDraft((p) => ({ ...p, ...patch }));
  const runSearch = () => {
    setApplied(draft);
    setPage(0);
  };
  const reset = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setQuick(null);
    setPage(0);
  };
  const applyQuick = (q: QuickRange) => {
    const r = rangeFor(q);
    const next = { ...draft, from: r.from, to: r.to };
    setDraft(next);
    setApplied((p) => ({ ...p, from: r.from, to: r.to }));
    setQuick(q);
    setPage(0);
  };

  // Each sale paired with its derived bill figures, newest first (API order).
  const rows = useMemo(
    () => (sales ?? []).map((s) => ({ sale: s, bill: saleBill(s) })),
    [sales],
  );

  const filtered = useMemo(() => {
    const f = applied;
    const min = f.minAmount ? Number(f.minAmount) : null;
    const max = f.maxAmount ? Number(f.maxAmount) : null;
    const bill = f.billNumber.trim().toLowerCase();
    return rows.filter(({ sale, bill: b }) => {
      if (f.from && sale.date < f.from) return false;
      if (f.to && sale.date > f.to) return false;
      if (f.customerId && sale.customerId !== f.customerId) return false;
      if (bill && !sale.saleNumber.toLowerCase().includes(bill)) return false;
      if (f.paymentType && sale.paymentMode !== f.paymentType) return false;
      if (f.paymentStatus && b.status !== f.paymentStatus) return false;
      if (min !== null && b.grandTotal < min) return false;
      if (max !== null && b.grandTotal > max) return false;
      return true;
    });
  }, [rows, applied]);

  // Summary cards reflect the full filtered set (not just the current page).
  const summary = useMemo(() => {
    let amount = 0, cash = 0, credit = 0, outstanding = 0;
    for (const { bill } of filtered) {
      amount += bill.grandTotal;
      if (bill.isCash) cash += bill.grandTotal;
      else credit += bill.grandTotal;
      outstanding += bill.balance;
    }
    return { amount, bills: filtered.length, cash, credit, outstanding };
  }, [filtered]);

  const paged = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  const editSale = (sale: Sale) => navigate(`/sales?edit=${sale.id}`);

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSale(confirmDelete.sale.id).unwrap();
      setToast(`Sale ${confirmDelete.sale.saleNumber} deleted · stock restored`);
      setConfirmDelete(null);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not delete sale.');
      setConfirmDelete(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>All Sales</Typography>
        <Typography variant="body2" color="text.secondary">
          Every sales bill in the system. Search, filter, view, edit, print or delete.
        </Typography>
      </Box>

      {/* ---- Summary cards (reflect the current filter) ---- */}
      <Grid container spacing={1.5}>
        <SummaryCard label="Total Sales" value={formatCurrency(summary.amount, false)} />
        <SummaryCard label="Total Bills" value={String(summary.bills)} />
        <SummaryCard label="Cash Sales" value={formatCurrency(summary.cash, false)} color="success.main" />
        <SummaryCard label="Credit Sales" value={formatCurrency(summary.credit, false)} />
        <SummaryCard label="Outstanding" value={formatCurrency(summary.outstanding, false)} color="warning.main" />
      </Grid>

      {/* ---- Filters ---- */}
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              {QUICK.map((q) => (
                <Chip
                  key={q.value}
                  label={q.label}
                  size="small"
                  color={quick === q.value ? 'primary' : 'default'}
                  variant={quick === q.value ? 'filled' : 'outlined'}
                  onClick={() => applyQuick(q.value)}
                />
              ))}
            </Stack>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size="small" label="Date from" type="date" value={draft.from}
                  onChange={(e) => { setField({ from: e.target.value }); setQuick(null); }}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size="small" label="Date to" type="date" value={draft.to}
                  onChange={(e) => { setField({ to: e.target.value }); setQuick(null); }}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField select fullWidth size="small" label="Customer" value={draft.customerId}
                  onChange={(e) => setField({ customerId: e.target.value })}>
                  <MenuItem value="">All customers</MenuItem>
                  {activeCustomers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth size="small" label="Bill number" value={draft.billNumber}
                  onChange={(e) => setField({ billNumber: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  placeholder="e.g. SALE-0007" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField select fullWidth size="small" label="Payment type" value={draft.paymentType}
                  onChange={(e) => setField({ paymentType: e.target.value as Filters['paymentType'] })}>
                  <MenuItem value="">All</MenuItem>
                  {PAYMENT_TYPES.map((p) => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField select fullWidth size="small" label="Payment status" value={draft.paymentStatus}
                  onChange={(e) => setField({ paymentStatus: e.target.value as Filters['paymentStatus'] })}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size="small" label="Min amount ₹" type="number" value={draft.minAmount}
                  onChange={(e) => setField({ minAmount: e.target.value })}
                  inputProps={{ inputMode: 'decimal', min: 0 }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth size="small" label="Max amount ₹" type="number" value={draft.maxAmount}
                  onChange={(e) => setField({ maxAmount: e.target.value })}
                  inputProps={{ inputMode: 'decimal', min: 0 }} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={runSearch}>Search</Button>
              <Button color="inherit" startIcon={<RestartAltRoundedIcon />} onClick={reset}>Reset</Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
                {filtered.length} record{filtered.length === 1 ? '' : 's'}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Typography variant="caption" color="text.secondary">
        Paid / balance are derived from the payment mode — cash, UPI and bank sales count as paid; credit sales
        remain outstanding against the customer's ledger.
      </Typography>

      {/* ---- Listing ---- */}
      <Paper variant="outlined">
        <TableContainer sx={{ maxHeight: { md: 'calc(100dvh - 360px)' } }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bill No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Weight</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="right">Other</TableCell>
                <TableCell align="right">Commission</TableCell>
                <TableCell align="right">Mkt Fee</TableCell>
                <TableCell align="right">Grand Total</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={14} align="center" sx={{ py: 4 }}>Loading…</TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {rows.length === 0 ? 'No sales yet.' : 'No sales match these filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map(({ sale, bill }) => (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{sale.saleNumber}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{sale.date}</TableCell>
                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {customerName(sale.customerId)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={sale.paymentMode.toUpperCase()}
                        color={bill.isCash ? 'success' : 'default'}
                        variant={bill.isCash ? 'filled' : 'outlined'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">{bill.totalQty}</TableCell>
                    <TableCell align="right">{bill.totalWeight}</TableCell>
                    <TableCell align="right">{formatCurrency(bill.subtotal, false)}</TableCell>
                    <TableCell align="right">{bill.otherCharges ? formatCurrency(bill.otherCharges, false) : '—'}</TableCell>
                    <TableCell align="right">{formatCurrency(bill.commission, false)}</TableCell>
                    <TableCell align="right">{formatCurrency(bill.marketFee, false)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{formatCurrency(bill.grandTotal, false)}</TableCell>
                    <TableCell align="right">{formatCurrency(bill.paid, false)}</TableCell>
                    <TableCell align="right" sx={{ color: bill.balance > 0 ? 'warning.main' : 'text.secondary', fontWeight: bill.balance > 0 ? 700 : 400 }}>
                      {formatCurrency(bill.balance, false)}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0} justifyContent="center">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => setViewing(sale)} aria-label={`View ${sale.saleNumber}`}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => editSale(sale)} aria-label={`Edit ${sale.saleNumber}`}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print / PDF">
                          <IconButton size="small" onClick={(e) => setPrintFor({ sale, anchor: e.currentTarget })} aria-label={`Print ${sale.saleNumber}`}>
                            <PrintRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error"
                              onClick={() => setConfirmDelete({ sale, customer: customerName(sale.customerId) })}
                              aria-label={`Delete ${sale.saleNumber}`}>
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Paper>

      {/* ---- Direct print-from-listing menu ---- */}
      <PrintMenu
        anchorEl={printFor?.anchor ?? null}
        onClose={() => setPrintFor(null)}
        onPick={(paper) => {
          if (printFor) output(printFor.sale, paper);
          setPrintFor(null);
        }}
      />
      <ThermalPrintDialog doc={thermalDoc} onClose={() => setThermalDoc(null)} />

      {/* ---- View (complete bill) ---- */}
      <SaleInvoiceDialog
        sale={viewing}
        onClose={() => setViewing(null)}
        onEdit={(s) => editSale(s)}
        canEdit
      />

      {/* ---- Delete confirmation ---- */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete sale {confirmDelete?.sale.saleNumber}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Bill <b>{confirmDelete?.sale.saleNumber}</b> for <b>{confirmDelete?.customer}</b> will be permanently deleted.
            Its stock is returned to the lots it was sold from and the customer's outstanding is adjusted. A sale that is
            part of a finalised supplier settlement cannot be deleted. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Grid size={{ xs: 6, md: 2.4 }}>
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
