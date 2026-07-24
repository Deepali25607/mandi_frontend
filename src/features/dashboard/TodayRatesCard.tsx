import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useGetItemsQuery, useGetLatestPricesQuery } from '@/api/mastersApi';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency } from '@/utils/format';

/** Roles that may update prices (mirrors the Daily Prices nav entry). */
const CAN_UPDATE = new Set(['org_admin', 'inventory_manager', 'sales_operator']);

/**
 * Today's Rates — the live daily-price board, visible to EVERY user on the
 * dashboard. Reflects the newest logged price per item, with the change vs the
 * previous rate.
 */
export default function TodayRatesCard() {
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data: items } = useGetItemsQuery();
  const { data: latest } = useGetLatestPricesQuery();

  const rates = useMemo(() => {
    const priceMap = new Map((latest ?? []).map((p) => [p.itemId, p]));
    return (items ?? [])
      .filter((i) => i.isActive && priceMap.has(i.id))
      .map((i) => ({ item: i, price: priceMap.get(i.id)! }))
      .sort((a, b) => a.item.name.localeCompare(b.item.name));
  }, [items, latest]);

  const updatedToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <CurrencyRupeeRoundedIcon color="primary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Today's Rates</Typography>
            <Typography variant="caption" color="text.secondary">
              Latest selling price per item — updates the moment anyone changes a rate.
            </Typography>
          </Box>
          {role && CAN_UPDATE.has(role) && (
            <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => navigate('/prices')}>
              Update
            </Button>
          )}
        </Stack>

        {rates.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No rates set yet{role && CAN_UPDATE.has(role) ? ' — tap Update to set today’s prices.' : '.'}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {rates.map(({ item, price }) => {
              const delta = price.previousPrice != null ? price.price - price.previousPrice : null;
              const up = (delta ?? 0) > 0;
              return (
                <Tooltip
                  key={item.id}
                  title={`Updated ${new Date(price.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${delta ? ` · ${up ? '+' : ''}${formatCurrency(delta, false)} vs previous` : ''}`}
                >
                  <Chip
                    variant={updatedToday(price.updatedAt) ? 'filled' : 'outlined'}
                    color={updatedToday(price.updatedAt) ? 'success' : 'default'}
                    icon={delta ? (up ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />) : undefined}
                    label={`${item.name} ${formatCurrency(price.price, false)}/${item.unit}`}
                    sx={{ fontWeight: 700 }}
                  />
                </Tooltip>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
