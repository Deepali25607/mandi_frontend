import { Box, Button, Chip, Drawer, Stack, Typography } from '@mui/material';
import { KHATA } from '../khataTheme';

export type SortKey = 'recent' | 'name' | 'amount';
export type BalanceFilter = 'all' | 'get' | 'give' | 'settled';

export interface PartyFilters {
  sort: SortKey;
  balance: BalanceFilter;
}

export const DEFAULT_FILTERS: PartyFilters = { sort: 'recent', balance: 'all' };

interface Props {
  open: boolean;
  value: PartyFilters;
  onChange: (v: PartyFilters) => void;
  onClose: () => void;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'amount', label: 'Highest amount' },
];
const BALANCES: { key: BalanceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'get', label: 'You will get' },
  { key: 'give', label: 'You will give' },
  { key: 'settled', label: 'Settled up' },
];

/** Bottom sheet with sort + balance filters for the party list. */
export default function FilterSheet({ open, value, onChange, onClose }: Props) {
  const chip = <K extends string>(active: K, key: K, label: string, set: (k: K) => void) => (
    <Chip
      key={key}
      label={label}
      clickable
      onClick={() => set(key)}
      sx={{
        fontSize: 15,
        px: 0.5,
        bgcolor: active === key ? KHATA.blue : '#fff',
        color: active === key ? '#fff' : KHATA.text,
        border: `1px solid ${active === key ? KHATA.blue : KHATA.border}`,
        '&:hover': { bgcolor: active === key ? KHATA.blueDark : '#f3f4f6' },
      }}
    />
  );

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxWidth: 480, mx: 'auto', px: 2.5, pb: 3 } }}>
      <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: KHATA.sheetHandle, mx: 'auto', my: 1.5 }} />
      <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 2 }}>Filters</Typography>
      <Typography sx={{ fontSize: 14, color: KHATA.muted, mb: 1, letterSpacing: 0.5 }}>SORT BY</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
        {SORTS.map((s) => chip(value.sort, s.key, s.label, (sort) => onChange({ ...value, sort })))}
      </Stack>
      <Typography sx={{ fontSize: 14, color: KHATA.muted, mb: 1, letterSpacing: 0.5 }}>SHOW</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
        {BALANCES.map((b) => chip(value.balance, b.key, b.label, (balance) => onChange({ ...value, balance })))}
      </Stack>
      <Stack direction="row" spacing={1.5}>
        <Button fullWidth variant="outlined" onClick={() => onChange(DEFAULT_FILTERS)} sx={{ color: KHATA.blue, borderColor: KHATA.blue }}>
          Clear
        </Button>
        <Button fullWidth variant="contained" onClick={onClose} sx={{ bgcolor: KHATA.blue, '&:hover': { bgcolor: KHATA.blueDark } }}>
          Apply
        </Button>
      </Stack>
    </Drawer>
  );
}
