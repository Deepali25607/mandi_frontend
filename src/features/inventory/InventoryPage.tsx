import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  alpha,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControlLabel,
  LinearProgress,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ScaleRoundedIcon from '@mui/icons-material/ScaleRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import { useGetStockLotsQuery, useGetStockSummaryQuery } from '@/api/operationsApi';
import { useGetItemsQuery, useGetSuppliersQuery } from '@/api/mastersApi';
import { formatCurrency, formatNumber } from '@/utils/format';

// Stable colours per produce category, with a rotating fallback palette.
const CATEGORY_COLORS: Record<string, string> = {
  vegetables: '#2e9e5b',
  fruits: '#f0a500',
  flowers: '#e0533d',
  grains: '#8d6e63',
  dairy: '#2f80ed',
};
const FALLBACK = ['#1f8a4c', '#2f80ed', '#9b51e0', '#f0a500', '#eb5757', '#56ccf2', '#27ae60', '#e0533d'];
const catColor = (cat: string, i = 0) => CATEGORY_COLORS[cat?.toLowerCase()] ?? FALLBACK[i % FALLBACK.length];

const daysAgo = (d: string) => Math.max(0, Math.round((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000));

type InvFilter = 'value' | 'items' | 'weight' | 'lots';
const FILTER_HINT: Record<InvFilter, string> = {
  value: 'All items — highest value first',
  items: 'Only items currently in stock',
  weight: 'All items — heaviest first',
  lots: 'Open stock lots',
};

export default function InventoryPage() {
  const theme = useTheme();
  const [filter, setFilter] = useState<InvFilter>('value');
  const tab = filter === 'lots' ? 1 : 0;
  const [search, setSearch] = useState('');
  const [showAllLots, setShowAllLots] = useState(false);
  const { data: summary, isLoading: loadingSummary } = useGetStockSummaryQuery();
  const { data: lots, isLoading: loadingLots } = useGetStockLotsQuery({ availableOnly: !showAllLots });
  const { data: items } = useGetItemsQuery();
  const { data: suppliers } = useGetSuppliersQuery();

  const itemName = useMemo(() => {
    const m = new Map((items ?? []).map((i) => [i.id, i.name]));
    return (id: string) => m.get(id) ?? 'Item';
  }, [items]);
  const supplierName = useMemo(() => {
    const m = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) ?? '';
  }, [suppliers]);

  const rows = useMemo(() => [...(summary ?? [])].sort((a, b) => b.stockValue - a.stockValue), [summary]);
  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);
  const totalWeight = rows.reduce((s, r) => s + r.weightAvailable, 0);
  const totalLots = rows.reduce((s, r) => s + r.lots, 0);
  const itemsInStock = rows.filter((r) => r.weightAvailable > 0).length;

  const q = search.trim().toLowerCase();
  // The active tile drives which items show and how they're ordered.
  const filteredItems = useMemo(() => {
    let r = rows.filter((x) => !q || x.itemName.toLowerCase().includes(q) || x.category.toLowerCase().includes(q));
    if (filter === 'items') r = r.filter((x) => x.weightAvailable > 0);
    if (filter === 'weight') r = [...r].sort((a, b) => b.weightAvailable - a.weightAvailable);
    return r; // 'value' (and 'items') keep the value-sorted order from `rows`
  }, [rows, q, filter]);
  const filteredLots = (lots ?? []).filter((l) => !q || itemName(l.itemId).toLowerCase().includes(q) || l.lotNumber.toLowerCase().includes(q));

  // Footer totals reflect what's currently shown.
  const viewWeight = filteredItems.reduce((s, r) => s + r.weightAvailable, 0);
  const viewLots = filteredItems.reduce((s, r) => s + r.lots, 0);
  const viewValue = filteredItems.reduce((s, r) => s + r.stockValue, 0);

  return (
    <Stack spacing={2}>
      {/* KPI strip — each tile filters the view below */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' } }}>
        <Kpi icon={Inventory2RoundedIcon} tint="#1f8a4c" label="Total stock value" value={loadingSummary ? '—' : formatCurrency(totalValue, false)} active={filter === 'value'} onClick={() => setFilter('value')} />
        <Kpi icon={CategoryRoundedIcon} tint="#2f80ed" label="Items in stock" value={loadingSummary ? '—' : String(itemsInStock)} active={filter === 'items'} onClick={() => setFilter('items')} />
        <Kpi icon={ScaleRoundedIcon} tint="#f0a500" label="Total weight" value={loadingSummary ? '—' : `${formatNumber(Math.round(totalWeight))} kg`} active={filter === 'weight'} onClick={() => setFilter('weight')} />
        <Kpi icon={LayersRoundedIcon} tint="#9b51e0" label="Open lots" value={loadingSummary ? '—' : String(totalLots)} active={filter === 'lots'} onClick={() => setFilter('lots')} />
      </Box>

      {/* Stock value composition */}
      {!loadingSummary && rows.length > 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Stock value mix</Typography>
              <Typography variant="caption" color="text.secondary">{formatCurrency(totalValue, false)} total</Typography>
            </Stack>
            <Box sx={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', bgcolor: 'action.hover' }}>
              {rows.map((r, i) => {
                const share = totalValue > 0 ? (r.stockValue / totalValue) * 100 : 0;
                if (share <= 0) return null;
                return (
                  <Tooltip key={r.itemId} title={`${r.itemName} · ${formatCurrency(r.stockValue, false)} (${share.toFixed(0)}%)`} arrow>
                    <Box sx={{ width: `${share}%`, bgcolor: catColor(r.category, i), transition: 'width .3s', '&:hover': { filter: 'brightness(1.1)' } }} />
                  </Tooltip>
                );
              })}
            </Box>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
              {rows.slice(0, 8).map((r, i) => (
                <Stack key={r.itemId} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: catColor(r.category, i) }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{r.itemName}</Typography>
                  <Typography variant="caption" color="text.secondary">{totalValue > 0 ? Math.round((r.stockValue / totalValue) * 100) : 0}%</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setFilter(v === 1 ? 'lots' : 'value')} variant="fullWidth" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label="By Item" />
          <Tab label="By Lot" />
        </Tabs>

        <CardContent>
          {/* Toolbar */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <TextField
              size="small" placeholder="Search item or lot…" value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> }}
              sx={{ flexGrow: 1, maxWidth: 360 }}
            />
            <Chip size="small" icon={<FilterAltRoundedIcon />} label={FILTER_HINT[filter]} sx={{ fontWeight: 600 }} />
            {tab === 1 && (
              <FormControlLabel
                control={<Switch size="small" checked={showAllLots} onChange={(e) => setShowAllLots(e.target.checked)} />}
                label="Include empty/closed lots"
              />
            )}
          </Stack>

          {/* By Item */}
          {tab === 0 && (
            loadingSummary ? <LoadingRows /> :
            filteredItems.length === 0 ? <Empty text={q ? 'No items match your search.' : 'No stock available. Record an arrival to add stock.'} /> : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <Th>Item</Th><Th right>Available</Th><Th right>Lots</Th><Th right>Value</Th><Th>Share of value</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((r, i) => {
                      const share = totalValue > 0 ? (r.stockValue / totalValue) * 100 : 0;
                      const color = catColor(r.category, i);
                      return (
                        <TableRow key={r.itemId} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(color, 0.15), color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                <Inventory2RoundedIcon sx={{ fontSize: 18 }} />
                              </Box>
                              <Box>
                                <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>{r.itemName}</Typography>
                                <Chip size="small" label={r.category} sx={{ height: 17, fontSize: '0.62rem', textTransform: 'capitalize', bgcolor: alpha(color, 0.12), color }} />
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatNumber(r.weightAvailable)} {r.unit}</TableCell>
                          <TableCell align="right">{r.lots}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(r.stockValue, false)}</TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LinearProgress variant="determinate" value={share} sx={{ flexGrow: 1, height: 7, borderRadius: 1, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 30, textAlign: 'right' }}>{share.toFixed(0)}%</Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Total · {filteredItems.length} items</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>{formatNumber(Math.round(viewWeight))} kg</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>{viewLots}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>{formatCurrency(viewValue, false)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </Box>
            )
          )}

          {/* By Lot */}
          {tab === 1 && (
            loadingLots ? <LoadingRows /> :
            filteredLots.length === 0 ? <Empty text={q ? 'No lots match your search.' : showAllLots ? 'No lots yet.' : 'No open lots. Toggle to include closed lots.'} /> : (
              <Stack spacing={1}>
                {filteredLots.map((lot) => {
                  const pct = lot.qtyArrived > 0 ? Math.round((lot.qtyAvailable / lot.qtyArrived) * 100) : 0;
                  const st = lotStatus(pct);
                  const age = daysAgo(lot.date);
                  const barColor = st.color === 'default' ? theme.palette.grey[400] : theme.palette[st.color].main;
                  return (
                    <Box key={lot.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                        <Typography sx={{ fontWeight: 800 }} noWrap>{lot.lotNumber}</Typography>
                        <Chip size="small" label={st.label} color={st.color} sx={{ height: 20, fontWeight: 700 }} />
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(lot.weightAvailable * lot.rate, false)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                        <Typography variant="caption" color="text.secondary">{itemName(lot.itemId)}</Typography>
                        {supplierName(lot.supplierId) && <Typography variant="caption" color="text.secondary">· {supplierName(lot.supplierId)}</Typography>}
                        <Typography variant="caption" color="text.secondary">· @ {formatCurrency(lot.rate, false)}/kg</Typography>
                        <Typography variant="caption" color="text.secondary">· {age === 0 ? 'today' : `${age}d ago`}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 1, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: barColor } }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 120, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {formatNumber(lot.qtyAvailable)} / {formatNumber(lot.qtyArrived)} bags
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

type StatusColor = 'success' | 'info' | 'warning' | 'default';
function lotStatus(pct: number): { label: string; color: StatusColor } {
  if (pct <= 0) return { label: 'Empty', color: 'default' };
  if (pct >= 100) return { label: 'Fresh', color: 'success' };
  if (pct < 25) return { label: 'Low', color: 'warning' };
  return { label: 'Selling', color: 'info' };
}

function Kpi({ icon: Icon, label, value, tint, active, onClick }: { icon: ComponentType<{ fontSize?: 'small' }>; label: string; value: string; tint: string; active?: boolean; onClick?: () => void }) {
  return (
    <Card sx={{ ...(active ? { bgcolor: 'primary.main', color: 'primary.contrastText', border: 'none' } : { borderColor: 'divider' }), transition: 'background-color .15s' }}>
      <CardActionArea onClick={onClick} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: active ? 'rgba(255,255,255,0.2)' : alpha(tint, 0.14), color: active ? '#fff' : tint }}>
            <Icon fontSize="small" />
          </Box>
          <Typography variant="caption" noWrap sx={{ opacity: active ? 0.95 : 0.75, flexGrow: 1 }}>{label}</Typography>
          {active && <FilterAltRoundedIcon sx={{ fontSize: 15, opacity: 0.9 }} />}
        </Stack>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
      </CardActionArea>
    </Card>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <TableCell align={right ? 'right' : 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</TableCell>;
}

function LoadingRows() {
  return (
    <Stack spacing={1}>
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rounded" height={40} />)}
    </Stack>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
      <Inventory2RoundedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
      <Typography color="text.secondary" sx={{ textAlign: 'center' }}>{text}</Typography>
    </Stack>
  );
}
