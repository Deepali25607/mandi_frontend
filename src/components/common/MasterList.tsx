import type { ReactNode } from 'react';
import {
  Box,
  Button,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';

interface MasterListProps<T> {
  title: string;
  addLabel?: string;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  items: T[] | undefined;
  loading: boolean;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onAdd?: () => void;
  emptyText?: string;
}

export default function MasterList<T>({
  title,
  addLabel = 'Add',
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  items,
  loading,
  getKey,
  renderItem,
  onAdd,
  emptyText = 'No records yet.',
}: MasterListProps<T>) {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
          {title}
          {items && (
            <Typography component="span" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
              ({items.length})
            </Typography>
          )}
        </Typography>
        {onAdd && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAdd}>
            {addLabel}
          </Button>
        )}
      </Box>

      <TextField
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {loading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 3 }} />
          ))}
        </Stack>
      ) : !items || items.length === 0 ? (
        <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: 'text.secondary' }}>
          <InboxRoundedIcon sx={{ fontSize: 48, opacity: 0.5 }} />
          <Typography>{emptyText}</Typography>
        </Stack>
      ) : (
        <Stack spacing={1.5}>{items.map((item) => <Box key={getKey(item)}>{renderItem(item)}</Box>)}</Stack>
      )}
    </Stack>
  );
}
