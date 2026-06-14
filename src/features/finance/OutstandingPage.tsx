import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useGetCustomerAgingQuery,
  useGetCustomerOutstandingQuery,
  useGetOutstandingSummaryQuery,
  useGetSupplierOutstandingQuery,
} from '@/api/financeApi';
import { formatCurrency } from '@/utils/format';

export default function OutstandingPage() {
  const [tab, setTab] = useState(0);
  const { data: summary } = useGetOutstandingSummaryQuery();
  const { data: customers, isLoading: lc } = useGetCustomerOutstandingQuery();
  const { data: suppliers, isLoading: ls } = useGetSupplierOutstandingQuery();
  const { data: aging } = useGetCustomerAgingQuery();

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
    </Stack>
  );
}

function PartyList({
  rows,
  loading,
  empty,
  positiveLabel,
}: {
  rows: { id: string; name: string; sub: string; balance: number; detail: string }[];
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
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
