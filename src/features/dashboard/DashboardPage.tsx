import {
  Alert,
  Box,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useGetDashboardOverviewQuery } from '@/api/dashboardApi';
import { useAppSelector } from '@/store/hooks';
import KpiCard from '@/components/common/KpiCard';
import ChartCard from '@/components/common/ChartCard';
import { formatCurrency } from '@/utils/format';

const PIE_COLORS = ['#1f8a4c', '#f0a500', '#2f80ed', '#9b51e0', '#eb5757', '#56ccf2'];

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
                onClick={KPI_LINKS[kpi.key] ? () => navigate(KPI_LINKS[kpi.key]) : undefined}
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

        <ChartCard title="Collection Trend" subtitle="Last 7 days">
          {data ? (
            <ResponsiveContainer>
              <BarChart data={data.charts.collectionTrend} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceff0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} fontSize={12} width={56} />
                <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2f80ed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton variant="rounded" height="100%" />
          )}
        </ChartCard>

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

        <ChartCard title="Sales by Customer">
          {data ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.charts.customerWiseSales}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {data.charts.customerWiseSales.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton variant="rounded" height="100%" />
          )}
        </ChartCard>
      </Box>
    </Stack>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
