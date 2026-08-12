import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useGetCustomerAgingQuery,
  useGetCustomerLedgerQuery,
  useGetCustomerOutstandingQuery,
  useGetOutstandingSummaryQuery,
  useGetSupplierLedgerQuery,
  useGetSupplierOutstandingQuery,
} from '@/api/financeApi';
import type { CustomerOutstandingRow, SupplierOutstandingRow } from '@/types/finance';
import { formatCurrency } from '@/utils/format';

export default function OutstandingPage() {
  const [tab, setTab] = useState(0);
  const { data: summary } = useGetOutstandingSummaryQuery();
  const { data: customers, isLoading: lc } = useGetCustomerOutstandingQuery();
  const { data: suppliers, isLoading: ls } = useGetSupplierOutstandingQuery();
  const { data: aging } = useGetCustomerAgingQuery();
  const [selCustomer, setSelCustomer] = useState<CustomerOutstandingRow | null>(null);
  const [selSupplier, setSelSupplier] = useState<SupplierOutstandingRow | null>(null);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr' } }}>
        <Card sx={{ bgcolor: 'success.main', color: '#fff' }}>
          <CardContent>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Receivable</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{formatCurrency(summary?.receivable ?? 0, false)}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'error.main', color: '#fff' }}>
          <CardContent>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Payable</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{formatCurrency(summary?.payable ?? 0, false)}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label="Customers" />
        <Tab label="Suppliers" />
        <Tab label="Aging" />
      </Tabs>

      {tab === 0 && (
        <PartyList
          loading={lc}
          empty="No customer dues."
          rows={(customers ?? []).map((c) => ({
            id: c.customerId, name: c.name, sub: c.area ?? c.code, balance: c.balance,
            detail: `Sales ${formatCurrency(c.sales)} · Collected ${formatCurrency(c.collected)}`,
            onClick: () => setSelCustomer(c),
          }))}
          positiveLabel="due"
        />
      )}

      {tab === 1 && (
        <PartyList
          loading={ls}
          empty="No supplier dues."
          rows={(suppliers ?? []).map((s) => ({
            id: s.supplierId, name: s.name, sub: s.village ?? s.code, balance: s.balance,
            detail: `Billed ${formatCurrency(s.billed)} · Paid ${formatCurrency(s.paid)}${s.unbilled > 0.5 ? ` · Unbilled ${formatCurrency(s.unbilled)}` : ''}`,
            onClick: () => setSelSupplier(s),
          }))}
          positiveLabel="payable"
        />
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Receivables by age (FIFO)</Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={aging ?? []} margin={{ left: -8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceff0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} fontSize={12} width={56} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#f0a500" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      <CustomerDetailDialog row={selCustomer} onClose={() => setSelCustomer(null)} />
      <SupplierDetailDialog row={selSupplier} onClose={() => setSelSupplier(null)} />
    </Stack>
  );
}

function PartyList({
  rows,
  loading,
  empty,
  positiveLabel,
}: {
  rows: { id: string; name: string; sub: string; balance: number; detail: string; onClick: () => void }[];
  loading: boolean;
  empty: string;
  positiveLabel: string;
}) {
  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (rows.length === 0) return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{empty}</Typography>;
  return (
    <Stack spacing={1}>
      {rows.map((r) => (
        <Card key={r.id}>
          <CardActionArea onClick={r.onClick}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '12px !important' }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>{r.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{r.sub} · {r.detail}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontWeight: 800, color: r.balance >= 0 ? 'error.main' : 'success.main' }}>
                  {formatCurrency(Math.abs(r.balance))}
                </Typography>
                <Typography variant="caption" color="text.secondary">{r.balance >= 0 ? positiveLabel : 'advance'}</Typography>
              </Box>
              <ChevronRightRoundedIcon sx={{ color: 'text.disabled' }} />
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}

// ---- Party detail (opens on click) ----

function CustomerDetailDialog({ row, onClose }: { row: CustomerOutstandingRow | null; onClose: () => void }) {
  const { data: ledger, isFetching } = useGetCustomerLedgerQuery(row?.customerId ?? '', { skip: !row });
  return (
    <PartyDetailDialog
      open={!!row}
      onClose={onClose}
      name={row?.name ?? ''}
      sub={[row?.code, row?.area].filter(Boolean).join(' · ')}
      balance={row?.balance ?? 0}
      balanceLabel={(row?.balance ?? 0) >= 0 ? 'To collect' : 'Advance held'}
      stats={row ? [
        { label: 'Opening balance', value: row.opening },
        { label: 'Credit sales', value: row.sales },
        { label: 'Collected', value: row.collected, good: true },
        { label: 'Balance due', value: row.balance, emphasis: true },
      ] : []}
      ledger={ledger}
      loading={isFetching}
      note="Cash/UPI/bank sales are settled at the counter, so only credit sales and receipts appear here."
    />
  );
}

function SupplierDetailDialog({ row, onClose }: { row: SupplierOutstandingRow | null; onClose: () => void }) {
  const { data: ledger, isFetching } = useGetSupplierLedgerQuery(row?.supplierId ?? '', { skip: !row });
  return (
    <PartyDetailDialog
      open={!!row}
      onClose={onClose}
      name={row?.name ?? ''}
      sub={[row?.code, row?.village].filter(Boolean).join(' · ')}
      balance={row?.balance ?? 0}
      balanceLabel={(row?.balance ?? 0) >= 0 ? 'To pay' : 'Advance paid'}
      stats={row ? [
        { label: 'Opening balance', value: row.opening },
        { label: 'Billed (settlements)', value: row.billed },
        { label: 'Unbilled sales', value: row.unbilled },
        ...(Math.abs(row.adjustments ?? 0) > 0.01 ? [{ label: 'Adjustments', value: row.adjustments }] : []),
        { label: 'Paid', value: row.paid, good: true },
        { label: 'Balance payable', value: row.balance, emphasis: true },
      ] : []}
      ledger={ledger}
      loading={isFetching}
      note={row && row.unbilled > 0.5
        ? `Unbilled sales of ${formatCurrency(row.unbilled, false)} are owed but not yet settled into a bill, so they are not in the ledger below.`
        : undefined}
    />
  );
}

interface StatItem { label: string; value: number; good?: boolean; emphasis?: boolean }

function PartyDetailDialog({ open, onClose, name, sub, balance, balanceLabel, stats, ledger, loading, note }: {
  open: boolean;
  onClose: () => void;
  name: string;
  sub: string;
  balance: number;
  balanceLabel: string;
  stats: StatItem[];
  ledger?: { rows: { date: string; voucher: string; particulars: string; debit: number; credit: number; balance: number }[]; balance: number };
  loading: boolean;
  note?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>{name}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          <Chip
            color={balance >= 0 ? 'error' : 'success'}
            label={`${balanceLabel}: ${formatCurrency(Math.abs(balance), false)}`}
            sx={{ fontWeight: 700 }}
          />
          <IconButton size="small" onClick={onClose} aria-label="Close"><CloseRoundedIcon fontSize="small" /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' } }}>
            {stats.map((s) => (
              <Paper key={s.label} variant="outlined" sx={{ p: 1.25 }}>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{s.label}</Typography>
                <Typography sx={{
                  fontWeight: s.emphasis ? 800 : 700,
                  color: s.emphasis ? (s.value >= 0 ? 'error.main' : 'success.main') : s.good ? 'success.main' : 'text.primary',
                }}>
                  {formatCurrency(s.value, false)}
                </Typography>
              </Paper>
            ))}
          </Box>

          {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Transactions</Typography>
            {loading ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>Loading transactions…</Typography>
            ) : !ledger || ledger.rows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No transactions yet.</Typography>
            ) : (
              <LedgerTable rows={ledger.rows} closing={ledger.balance} />
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function LedgerTable({ rows, closing }: {
  rows: { date: string; voucher: string; particulars: string; debit: number; credit: number; balance: number }[];
  closing: number;
}) {
  const totalDr = rows.reduce((s, r) => s + r.debit, 0);
  const totalCr = rows.reduce((s, r) => s + r.credit, 0);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <Th>Date</Th><Th>Particulars</Th><Th right>Debit</Th><Th right>Credit</Th><Th right>Balance</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.date || '—'}</TableCell>
              <TableCell>{r.particulars}{r.voucher ? <Typography component="span" variant="caption" color="text.secondary"> · {r.voucher}</Typography> : ''}</TableCell>
              <TableCell align="right" sx={{ color: r.debit ? 'text.primary' : 'text.disabled' }}>{r.debit ? formatCurrency(r.debit, false) : '—'}</TableCell>
              <TableCell align="right" sx={{ color: r.credit ? 'success.main' : 'text.disabled' }}>{r.credit ? formatCurrency(r.credit, false) : '—'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(r.balance, false)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <Tf>Total</Tf><Tf />
            <Tf right>{formatCurrency(totalDr, false)}</Tf>
            <Tf right>{formatCurrency(totalCr, false)}</Tf>
            <Tf right>{formatCurrency(closing, false)}</Tf>
          </TableRow>
        </TableFooter>
      </Table>
    </Box>
  );
}

function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return <TableCell align={right ? 'right' : 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</TableCell>;
}
function Tf({ children, right }: { children?: ReactNode; right?: boolean }) {
  return <TableCell align={right ? 'right' : 'left'} sx={{ fontWeight: 800, color: 'text.primary' }}>{children}</TableCell>;
}
