import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useGetSalesByModeQuery } from '@/api/dashboardApi';
import { buildDateRangePresets } from '@/features/reports/shared';
import { formatCurrency } from '@/utils/format';

/**
 * A dashboard tile for one payment mode (Cash / Credit) showing the sales total
 * for a chosen date range, with a preset filter (Today, Yesterday, This Week…)
 * and the itemised invoices for that range.
 */
export default function SalesModeCard({
  mode, title, accent,
}: { mode: 'cash' | 'credit'; title: string; accent: string }) {
  const presets = useMemo(() => buildDateRangePresets(), []);
  const [presetKey, setPresetKey] = useState('today');
  const preset = presets.find((p) => p.key === presetKey) ?? presets[0];
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const { data, isFetching } = useGetSalesByModeQuery({ mode, from: preset.from, to: preset.to });

  return (
    <Card sx={{ height: '100%', borderTop: `3px solid ${accent}` }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {data?.count ?? 0} sale{(data?.count ?? 0) === 1 ? '' : 's'} · {preset.label}
            </Typography>
          </Box>
          <Button
            size="small" variant="outlined" color="inherit"
            startIcon={<CalendarMonthRoundedIcon />} endIcon={<ExpandMoreRoundedIcon />}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ textTransform: 'none', fontWeight: 700, borderColor: 'divider', flexShrink: 0 }}
          >
            {preset.label}
          </Button>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 360 } } }}>
            {presets.map((p) => (
              <MenuItem
                key={p.key}
                selected={p.key === presetKey}
                onClick={() => { setPresetKey(p.key); setAnchor(null); }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Stack>

        {isFetching && !data ? (
          <Skeleton variant="text" width={140} height={44} />
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 800, color: accent }}>
            {formatCurrency(data?.total ?? 0, false)}
          </Typography>
        )}

        <Box sx={{ mt: 1.5 }}>
          {!data ? (
            <Skeleton variant="rounded" height={180} />
          ) : data.rows.length === 0 ? (
            <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary" variant="body2">No {mode} sales in this period.</Typography>
            </Box>
          ) : (
            <Stack sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }} divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
              {data.rows.map((r) => (
                <Stack key={r.saleNumber} direction="row" alignItems="center" spacing={1} sx={{ py: 0.85 }}>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{r.customer}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {r.saleNumber} · {r.date}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {formatCurrency(r.gross, false)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        {data && data.rows.length > 0 && (
          <Chip
            size="small" label={`Total ${formatCurrency(data.total, false)}`}
            sx={{ mt: 1.5, fontWeight: 700, bgcolor: `${accent}22`, color: accent }}
          />
        )}
      </CardContent>
    </Card>
  );
}
