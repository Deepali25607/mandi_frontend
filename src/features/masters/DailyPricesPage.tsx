import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import {
  useGetItemsQuery,
  useGetLatestPricesQuery,
  useGetPriceHistoryQuery,
  useSetItemPriceMutation,
} from '@/api/mastersApi';
import { formatCurrency } from '@/utils/format';
import type { Item } from '@/types/domain';

/** How old a price can be before it's flagged as stale on the board. */
const STALE_DAYS = 2;

function PriceHistoryDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const { data: history, isLoading } = useGetPriceHistoryQuery(item.id);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Price history — {item.name}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
          Every change is logged: who set it, when, and from what price.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <LinearProgress />
        ) : (history ?? []).length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No price set yet for this item.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Price</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Change</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(history ?? []).map((h) => {
                const delta = h.previousPrice != null ? h.price - h.previousPrice : null;
                return (
                  <TableRow key={h.id}>
                    <TableCell>
                      {new Date(h.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {h.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {h.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(h.price, false)}/{item.unit}
                    </TableCell>
                    <TableCell align="right">
                      {delta === null ? (
                        <Chip size="small" label="First price" sx={{ height: 20 }} />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ color: delta > 0 ? 'success.main' : 'error.main', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                        >
                          {delta > 0 ? <TrendingUpRoundedIcon sx={{ fontSize: 16 }} /> : <TrendingDownRoundedIcon sx={{ fontSize: 16 }} />}
                          {delta > 0 ? '+' : ''}{formatCurrency(delta, false)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{h.updatedBy}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Daily rate board: today's selling price for every item, updated in seconds
 * each morning. All changes append to a full audit log; the newest price flows
 * automatically to Sale Entry and the Items master.
 */
export default function DailyPricesPage() {
  const [search, setSearch] = useState('');
  const { data: items, isLoading } = useGetItemsQuery(search || undefined);
  const { data: latest } = useGetLatestPricesQuery();
  const [setPrice] = useSetItemPriceMutation();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Item | null>(null);
  const [toast, setToast] = useState<{ severity: 'success' | 'info' | 'error'; text: string } | null>(null);

  const priceMap = useMemo(
    () => new Map((latest ?? []).map((p) => [p.itemId, p])),
    [latest],
  );
  const activeItems = (items ?? []).filter((i) => i.isActive);

  const isStale = (updatedAt?: string) => {
    if (!updatedAt) return false;
    return Date.now() - new Date(updatedAt).getTime() > STALE_DAYS * 24 * 3600 * 1000;
  };

  const save = async (item: Item) => {
    const raw = drafts[item.id];
    const value = Number(raw);
    if (!raw || !(value > 0)) return;
    setSaving(item.id);
    try {
      const res = await setPrice({ itemId: item.id, price: value }).unwrap();
      setToast(res.changed
        ? { severity: 'success', text: `${item.name}: price set to ${formatCurrency(value, false)}/${item.unit}` }
        : { severity: 'info', text: `${item.name} is already at ${formatCurrency(value, false)} — nothing logged.` });
      setDrafts((d) => ({ ...d, [item.id]: '' }));
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setToast({ severity: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save the price.' });
    }
    setSaving(null);
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Daily Prices</Typography>
        <Typography variant="body2" color="text.secondary">
          Set today's selling rate for each item. Every change is logged with who and when, and the
          latest rate is used across the app (sale entry, item master).
        </Typography>
      </Box>

      <TextField
        size="small" placeholder="Search items…" value={search}
        onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: 360 }}
      />

      {isLoading && <LinearProgress />}
      <Stack spacing={1}>
        {activeItems.map((item) => {
          const current = priceMap.get(item.id);
          const stale = isStale(current?.updatedAt);
          const draft = drafts[item.id] ?? '';
          return (
            <Card key={item.id} variant="outlined">
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, flexWrap: 'wrap' }} useFlexGap>
                <Box sx={{ flexGrow: 1, minWidth: 140 }}>
                  <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.code} · per {item.unit}
                  </Typography>
                </Box>

                {current ? (
                  <Tooltip title={`Updated ${new Date(current.updatedAt).toLocaleString('en-IN')}`}>
                    <Chip
                      color={stale ? 'warning' : 'success'}
                      variant={stale ? 'outlined' : 'filled'}
                      label={`${formatCurrency(current.price, false)}/${item.unit}${stale ? ' · old' : ''}`}
                      sx={{ fontWeight: 700 }}
                    />
                  </Tooltip>
                ) : (
                  <Chip variant="outlined" label="No price yet" />
                )}

                <TextField
                  size="small"
                  placeholder="New rate"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') void save(item); }}
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeRoundedIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
                  sx={{ width: 140 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CheckRoundedIcon />}
                  disabled={!(Number(draft) > 0) || saving === item.id}
                  onClick={() => save(item)}
                >
                  Set
                </Button>
                <Tooltip title="Price history">
                  <IconButton size="small" onClick={() => setHistoryFor(item)}>
                    <HistoryRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Card>
          );
        })}
        {!isLoading && activeItems.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No items found. Add items in the Item Master first.
          </Typography>
        )}
      </Stack>

      {historyFor && <PriceHistoryDialog item={historyFor} onClose={() => setHistoryFor(null)} />}

      <Snackbar
        open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
