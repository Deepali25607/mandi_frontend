import { Box, Chip, IconButton, InputAdornment, List, ListItemButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import type { BalanceFilter, PartyFilters, SortKey } from '../components/FilterSheet';
import PartyAvatar from '../components/PartyAvatar';
import { formatKhataAmount, timeAgo, type PartySummary } from '../utils';

interface Props {
  label: string;
  items: PartySummary[];
  total: number;
  selectedId?: string;
  query: string;
  onQuery: (q: string) => void;
  filters: PartyFilters;
  onFilters: (f: PartyFilters) => void;
  onSelect: (id: string) => void;
  onRemind: (s: PartySummary) => void;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'amount', label: 'Highest amount' },
];
const SHOW: { key: BalanceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'get', label: 'You will get' },
  { key: 'give', label: 'You will give' },
  { key: 'settled', label: 'Settled' },
];

/** Left pane of the desktop workspace: search, filters and the party list. */
export default function PartyListPanel({ label, items, total, selectedId, query, onQuery, filters, onFilters, onSelect, onRemind }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          placeholder={`Search ${label.toLowerCase()} by name or mobile`}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
          <Select size="small" value={filters.sort} onChange={(e) => onFilters({ ...filters, sort: e.target.value as SortKey })} sx={{ flex: 1, fontSize: 13 }}>
            {SORTS.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
          </Select>
          <Select size="small" value={filters.balance} onChange={(e) => onFilters({ ...filters, balance: e.target.value as BalanceFilter })} sx={{ flex: 1, fontSize: 13 }}>
            {SHOW.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
          </Select>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing {items.length} of {total} {label.toLowerCase()}{total === 1 ? '' : 's'}
        </Typography>
      </Box>

      <List disablePadding sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {items.map((s) => {
          const willGet = s.balance > 0;
          const willGive = s.balance < 0;
          const color = willGet ? 'error.main' : willGive ? 'success.main' : 'text.secondary';
          return (
            <ListItemButton
              key={s.party.id}
              selected={s.party.id === selectedId}
              onClick={() => onSelect(s.party.id)}
              sx={{ gap: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center' }}
            >
              <PartyAvatar name={s.party.name} size={40} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{s.party.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {s.lastActivity ? timeAgo(s.lastActivity) : 'No entries yet'}
                  {s.party.reminderDate && ' · reminder set'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color }}>{formatKhataAmount(s.balance)}</Typography>
                {s.balance !== 0 ? (
                  <Typography variant="caption" sx={{ color }}>{willGet ? 'you will get' : 'you will give'}</Typography>
                ) : (
                  <Chip label="Settled" size="small" sx={{ height: 18, fontSize: 11 }} />
                )}
              </Box>
              {s.balance !== 0 && (
                <Tooltip title="Send reminder">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemind(s); }} aria-label={`Remind ${s.party.name}`}>
                    <NotificationsNoneRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemButton>
          );
        })}
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No {label.toLowerCase()} matches.
          </Typography>
        )}
      </List>
    </Box>
  );
}
