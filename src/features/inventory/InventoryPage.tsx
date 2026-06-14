import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
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
  Typography,
} from '@mui/material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ScaleRoundedIcon from '@mui/icons-material/ScaleRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useGetStockLotsQuery, useGetStockSummaryQuery } from '@/api/operationsApi';
import { useGetItemsQuery } from '@/api/mastersApi';
import { formatCurrency, formatNumber } from '@/utils/format';

export default function InventoryPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [showAllLots, setShowAllLots] = useState(false);
  const { data: summary, isLoading: loadingSummary } = useGetStockSummaryQuery();
  const { data: lots, isLoading: loadingLots } = useGetStockLotsQuery({ availableOnly: !showAllLots });
  const { data: items } = useGetItemsQuery();

  const itemName = useMemo(() => {
    const m = new Map((items ?? []).map((i) => [i.id, i.name]));
    return (id: string) => m.get(id) ?? 'Item';
  }, [items]);

  const rows = summary ?? [];
  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);
  const totalWeight = rows.reduce((s, r) => s + r.weightAvailable, 0);
  const totalLots = rows.reduce((s, r) => s + r.lots, 0);
  const itemsInStock = rows.filter((r) => r.weightAvailable > 0).length;

  const q = search.trim().toLowerCase();
  const filteredItems = rows.filter((r) => !q || r.itemName.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  const filteredLots = (lots ?? []).filter((l) => !q || itemName(l.itemId).toLowerCase().includes(q) || l.lotNumber.toLowerCase().includes(q));

  return (
    <Stack spacing={2}>
      {/* KPI strip */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' } }}>
        <Kpi icon={Inventory2RoundedIcon} label="Total stock value" value={loadingSummary ? '—' : formatCurrency(totalValue, false)} accent />
        <Kpi icon={CategoryRoundedIcon} label="Items in stock" value={loadingSummary ? '—' : String(itemsInStock)} />
        <Kpi icon={ScaleRoundedIcon} label="Total weight" value={loadingSummary ? '—' : `${formatNumber(Math.round(totalWeight))} kg`} />
        <Kpi icon={LayersRoundedIcon} label="Open lots" value={loadingSummary ? '—' : String(totalLots)} />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
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
                      <Th>Item</Th><Th>Category</Th><Th right>Available</Th><Th right>Lots</Th><Th right>Value</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((r) => (
                      <TableRow key={r.itemId} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{r.itemName}</TableCell>
                        <TableCell><Chip size="small" label={r.category} sx={{ height: 20, textTransform: 'capitalize' }} /></TableCell>
                        <TableCell align="right">{formatNumber(r.weightAvailable)} {r.unit}</TableCell>
                        <TableCell align="right">{r.lots}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(r.stockValue, false)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Total</TableCell>
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>{formatNumber(Math.round(totalWeight))} kg</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>{totalLots}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary' }}>{formatCurrency(totalValue, false)}</TableCell>
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
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <Th>Lot</Th><Th>Item</Th><Th right>Available</Th><Th>Stock level</Th><Th right>Rate</Th><Th right>Value</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLots.map((lot) => {
                      const pct = lot.weightArrived > 0 ? Math.round((lot.weightAvailable / lot.weightArrived) * 100) : 0;
                      const empty = lot.weightAvailable <= 0.001;
                      return (
                        <TableRow key={lot.id} hover>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {lot.lotNumber}
                            {empty && <Chip size="small" label="empty" sx={{ ml: 0.5, height: 18, fontSize: '0.6rem' }} />}
                          </TableCell>
                          <TableCell>{itemName(lot.itemId)}</TableCell>
                          <TableCell align="right">{formatNumber(lot.weightAvailable)} / {formatNumber(lot.weightArrived)} kg</TableCell>
                          <TableCell sx={{ minWidth: 110 }}>
                            <LinearProgress variant="determinate" value={pct} color={pct > 50 ? 'success' : pct > 0 ? 'warning' : 'inherit'} sx={{ height: 6, borderRadius: 1 }} />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(lot.rate, false)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(lot.weightAvailable * lot.rate, false)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: ComponentType<{ fontSize?: 'small' }>; label: string; value: string; accent?: boolean }) {
  return (
    <Paper
      variant={accent ? 'elevation' : 'outlined'}
      sx={{ p: 1.5, ...(accent ? { bgcolor: 'primary.main', color: 'primary.contrastText' } : {}) }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: accent ? 0.9 : 0.7 }}>
        <Icon fontSize="small" />
        <Typography variant="caption" noWrap>{label}</Typography>
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25 }}>{value}</Typography>
    </Paper>
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
