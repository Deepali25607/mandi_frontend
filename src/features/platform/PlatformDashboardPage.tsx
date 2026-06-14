import { Box, Card, CardContent, Chip, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import type { ComponentType } from 'react';
import { useGetPlatformStatsQuery } from '@/api/platformApi';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'default' | 'error'> = {
  active: 'success', trial: 'info', suspended: 'warning', expired: 'error', cancelled: 'default',
};

function StatCard({ icon: Icon, label, value, color }: { icon: ComponentType<{ fontSize?: 'small' | 'large' }>; label: string; value: string; color: string }) {
  return (
    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ bgcolor: color, color: '#fff', width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center' }}>
            <Icon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PlatformDashboardPage() {
  const { data: stats, isLoading } = useGetPlatformStatsQuery();

  if (isLoading || !stats) return <LinearProgress />;

  const maxPlan = Math.max(1, ...stats.byPlan.map((p) => p.count));

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Platform Overview</Typography>
        <Typography variant="body2" color="text.secondary">Tenants, subscriptions and platform health.</Typography>
      </Box>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <StatCard icon={BusinessRoundedIcon} label="Organizations" value={String(stats.totalOrganizations)} color="#2e7d32" />
        <StatCard icon={CheckCircleRoundedIcon} label="Active organizations" value={String(stats.activeOrganizations)} color="#1565c0" />
        <StatCard icon={GroupsRoundedIcon} label="Total users" value={String(stats.totalUsers)} color="#6a1b9a" />
        <StatCard icon={CurrencyRupeeRoundedIcon} label="Est. monthly revenue" value={inr(stats.estimatedMrr)} color="#ef6c00" />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Organizations by plan</Typography>
            <Stack spacing={1.5}>
              {stats.byPlan.map((p) => (
                <Box key={p.planId ?? 'none'}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.planName}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.count}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(p.count / maxPlan) * 100} sx={{ height: 8, borderRadius: 1, mt: 0.5 }} />
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Subscription status</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {Object.entries(stats.byStatus).filter(([, c]) => c > 0).map(([status, count]) => (
                <Chip key={status} size="small" color={STATUS_COLORS[status] ?? 'default'} label={`${status}: ${count}`} sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Recently registered</Typography>
            <Stack spacing={1} divider={<Divider flexItem />}>
              {stats.recentOrganizations.length === 0 && (
                <Typography variant="body2" color="text.secondary">No organizations yet.</Typography>
              )}
              {stats.recentOrganizations.map((o) => (
                <Stack key={o.id} direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{o.planName ?? 'No plan'}</Typography>
                  </Box>
                  <Chip size="small" color={STATUS_COLORS[o.status] ?? 'default'} label={o.status} sx={{ textTransform: 'capitalize' }} />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
