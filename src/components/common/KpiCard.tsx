import { Box, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import type { ComponentType } from 'react';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import CallMadeRoundedIcon from '@mui/icons-material/CallMadeRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import type { KpiCard as KpiCardData } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';

const ICONS: Record<string, ComponentType> = {
  truck: LocalShippingRoundedIcon,
  cart: ShoppingCartRoundedIcon,
  cash: PaymentsRoundedIcon,
  wallet: AccountBalanceWalletRoundedIcon,
  receivable: CallReceivedRoundedIcon,
  payable: CallMadeRoundedIcon,
  box: Inventory2RoundedIcon,
  percent: PercentRoundedIcon,
  trend: TrendingUpRoundedIcon,
};

// Soft tinted backgrounds per KPI for quick visual scanning.
const TINTS: Record<string, string> = {
  truck: '#e8f3ec',
  cart: '#e6f0fb',
  cash: '#fdf3dd',
  wallet: '#e6f0fb',
  receivable: '#e8f7f0',
  payable: '#fdeaea',
  box: '#eef0f5',
  percent: '#f3ecfb',
  trend: '#e8f3ec',
};

export default function KpiCard({ data, onClick }: { data: KpiCardData; onClick?: () => void }) {
  const Icon = ICONS[data.icon] ?? TrendingUpRoundedIcon;
  const tint = TINTS[data.icon] ?? '#eef0f5';
  const hasDelta = typeof data.deltaPct === 'number';
  const up = (data.deltaPct ?? 0) >= 0;
  // Full numeric value (e.g. ₹22,900 instead of ₹22.9K) for precise reading.
  const valueText = data.format === 'currency' ? formatCurrency(data.value, false) : formatNumber(data.value);

  const body = (
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: tint, color: 'primary.dark', display: 'grid', placeItems: 'center' }}>
          <Icon />
        </Box>
        {hasDelta && (
          <Chip
            size="small"
            icon={up ? <ArrowUpwardRoundedIcon /> : <ArrowDownwardRoundedIcon />}
            label={`${Math.abs(data.deltaPct as number)}%`}
            sx={{
              fontWeight: 700,
              bgcolor: up ? '#e8f7f0' : '#fdeaea',
              color: up ? 'success.main' : 'error.main',
              '& .MuiChip-icon': { color: 'inherit', fontSize: 16 },
            }}
          />
        )}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{valueText}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {data.label}
        </Typography>
        {onClick && <ChevronRightRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
      </Box>
    </CardContent>
  );

  return (
    <Card sx={{ height: '100%' }}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{body}</CardActionArea>
      ) : body}
    </Card>
  );
}
