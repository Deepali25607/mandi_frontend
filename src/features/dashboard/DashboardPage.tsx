import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { useNavigate } from 'react-router-dom';
import { useGetCashInHandQuery, useGetDashboardOverviewQuery } from '@/api/dashboardApi';
import { useGetCustomerOutstandingQuery } from '@/api/financeApi';
import { useAppSelector } from '@/store/hooks';
import KpiCard from '@/components/common/KpiCard';
import ChartCard from '@/components/common/ChartCard';
import { formatCurrency } from '@/utils/format';
import type { CustomerOutstandingRow } from '@/types/finance';

/** Drill-down: each KPI tile opens the relevant detailed report. */
const KPI_LINKS: Record<string, string> = {
  todayArrival: '/reports/purchase-register',
  todaySales: '/reports/sales-register',
  todayCollections: '/reports/collection-register',
  outstandingReceivable: '/reports/customer-outstanding',
  outstandingPayable: '/reports/supplier-outstanding',
  inventoryValue: '/reports/stock-summary',
  commissionEarned: '/reports/sales-register',
  grossProfit: '/reports/sales-register',
};

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  // Always pull the latest figures when the dashboard is opened.
  const { data, isLoading, isError, refetch } = useGetDashboardOverviewQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: outstanding } = useGetCustomerOutstandingQuery();

  // Customers with money still to collect, highest pending first.
  const pending = useMemo(
    () => (outstanding ?? []).filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance),
    [outstanding],
  );
  const [detail, setDetail] = useState<CustomerOutstandingRow | null>(null);

  // "Today's Cash in Hand" tile → itemised cash inflow/outflow breakdown.
  const [cashOpen, setCashOpen] = useState(false);
  const { data: cash } = useGetCashInHandQuery(undefined, { skip: !cashOpen });

  const greeting = getGreeting();

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">
          {greeting}, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          {user?.organizationName && (
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {user.organizationName}
            </Typography>
          )}
          {user?.organizationName && (
            <Typography variant="body2" color="text.secondary">·</Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {user?.roleLabel}
          </Typography>
          {data?.isDemoData && (
            <Chip size="small" label="Sample data" color="warning" sx={{ fontWeight: 700 }} />
          )}
        </Stack>
      </Box>

      {isError && (
        <Alert severity="error" action={<Box onClick={() => refetch()} sx={{ cursor: 'pointer', fontWeight: 700 }}>RETRY</Box>}>
          Could not load dashboard data.
        </Alert>
      )}

      {/* KPI grid */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {isLoading || !data
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={132} sx={{ borderRadius: 4 }} />
            ))
          : data.kpis.map((kpi) => (
              <KpiCard
                key={kpi.key}
                data={kpi}
                onClick={
                  kpi.key === 'cashInHand'
                    ? () => setCashOpen(true)
                    : KPI_LINKS[kpi.key]
                      ? () => navigate(KPI_LINKS[kpi.key])
                      : undefined
                }
              />
            ))}
      </Box>

      {/* Charts */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
        }}
      >
        <ChartCard title="Daily Sales Trend" subtitle="Last 7 days">
          {data ? (
            <ResponsiveContainer>
              <AreaChart data={data.charts.dailySalesTrend} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f8a4c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1f8a4c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceff0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} fontSize={12} width={56} />
                <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
                <Area type="monotone" dataKey="value" stroke="#1f8a4c" strokeWidth={3} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton variant="rounded" height="100%" />
          )}
        </ChartCard>

        <ChartCard title="Outstanding Aging" subtitle="Receivables by age">
          {data ? (
            <ResponsiveContainer>
              <BarChart data={data.charts.outstandingAnalysis} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceff0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} fontSize={12} width={56} />
                <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#f0a500" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton variant="rounded" height="100%" />
          )}
        </ChartCard>

        {/* Customers with pending amount — tap for their details. */}
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Pending from Customers</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pending.length} customer{pending.length === 1 ? '' : 's'} with dues · tap for details
                </Typography>
              </Box>
              <Chip
                label={`Total ${formatCurrency(pending.reduce((s, c) => s + c.balance, 0), false)}`}
                color="warning" size="small" sx={{ fontWeight: 700 }}
              />
            </Stack>
            {!outstanding ? (
              <Skeleton variant="rounded" height={260} />
            ) : pending.length === 0 ? (
              <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No pending dues — all customers are settled 🎉</Typography>
              </Box>
            ) : (
              <Stack sx={{ height: 260, overflowY: 'auto', pr: 0.5 }}>
                {pending.map((c) => (
                  <ListItemButton
                    key={c.customerId}
                    onClick={() => setDetail(c)}
                    sx={{ borderRadius: 2, py: 1, px: 1.25 }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography sx={{ fontWeight: 600 }} noWrap>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {[c.code, c.area].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: 'warning.dark', whiteSpace: 'nowrap', ml: 1 }}>
                      {formatCurrency(c.balance, false)}
                    </Typography>
                    <ChevronRightRoundedIcon fontSize="small" color="action" sx={{ ml: 0.5 }} />
                  </ListItemButton>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <ChartCard title="Top Items by Sales">
          {data ? (
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={data.charts.itemWiseSales}
                margin={{ left: 16, right: 16, top: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eceff0" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={12} width={72} />
                <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#1f8a4c" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton variant="rounded" height="100%" />
          )}
        </ChartCard>

      </Box>

      {/* Customer pending details */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="xs">
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {detail.name}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
                  {[detail.code, detail.area].filter(Boolean).join(' · ') || '—'}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetail(null)} size="small"><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1}>
                <DetailRow label="Opening balance" value={detail.opening} />
                <DetailRow label="Sales (billed)" value={detail.sales} />
                <DetailRow label="Collected" value={-detail.collected} />
                <Divider />
                <DetailRow label="Pending amount" value={detail.balance} strong />
              </Stack>
              <Button
                fullWidth variant="contained" startIcon={<PaymentsRoundedIcon />} sx={{ mt: 2 }}
                onClick={() => { setDetail(null); navigate('/collections'); }}
              >
                Record Collection
              </Button>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Today's Cash in Hand — itemised cash inflows & outflows */}
      <Dialog open={cashOpen} onClose={() => setCashOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            Today's Cash in Hand
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
              {cash?.date ?? 'today'} · cash-mode transactions only
            </Typography>
          </Box>
          <IconButton onClick={() => setCashOpen(false)} size="small"><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {!cash ? (
            <Skeleton variant="rounded" height={200} />
          ) : (
            <>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <DetailRow label="＋ Cash sales" value={cash.cashSales} />
                <DetailRow label="− Cash expenses" value={-cash.cashExpenses} />
                <DetailRow label="− Deposits to bank" value={-cash.depositsToBank} />
                {cash.withdrawalsFromBank > 0 && (
                  <DetailRow label="＋ Withdrawals from bank" value={cash.withdrawalsFromBank} />
                )}
                <Divider />
                <DetailRow label="Cash in hand" value={cash.net} strong />
              </Stack>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Transactions ({cash.rows.length})
              </Typography>
              {cash.rows.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No cash transactions for this day.</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Voucher</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Particulars</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>In</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Out</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cash.rows.map((r) => (
                      <TableRow key={r.voucher}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.voucher}</TableCell>
                        <TableCell>{r.particulars}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.dark' }}>
                          {r.inflow ? formatCurrency(r.inflow, false) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.dark' }}>
                          {r.outflow ? formatCurrency(r.outflow, false) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: strong ? 800 : 600, color: strong ? 'warning.dark' : 'text.primary' }}>
        {formatCurrency(value, false)}
      </Typography>
    </Stack>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
