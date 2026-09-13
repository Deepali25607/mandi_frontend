import { useMemo, useState } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import type { StockLot } from '@/types/domain';
import { useLookups } from '@/utils/useLookups';

/**
 * Global "Lot No." business filter.
 *
 * Pass the lots that are valid in the *current* context (i.e. the ones that
 * actually occur in the data after every other filter has been applied) — the
 * dropdown then only ever offers reachable lot numbers, which is what makes
 * Supplier → Item → Lot cascade without any extra wiring in each screen.
 */
export function useLotFilter(candidateLots: StockLot[]) {
  const [lotId, setLotId] = useState('');
  const options = useMemo(
    () => [...candidateLots].sort((a, b) => b.date.localeCompare(a.date) || b.lotNumber.localeCompare(a.lotNumber)),
    [candidateLots],
  );
  // A selection that the other filters have made unreachable behaves as "All"
  // (and is shown cleared) rather than silently producing an empty report.
  const activeLotId = options.some((l) => l.id === lotId) ? lotId : '';
  return { lotId: activeLotId, setLotId, options };
}

/** Unique lots referenced by a list of lot ids, in the given lookup. */
export function lotsFromIds(ids: Iterable<string | null | undefined>, lotById: Map<string, StockLot>): StockLot[] {
  const seen = new Set<string>();
  const out: StockLot[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    const lot = lotById.get(id);
    if (lot) { seen.add(id); out.push(lot); }
  }
  return out;
}

interface Props {
  value: string;
  onChange: (lotId: string) => void;
  options: StockLot[];
  label?: string;
  /** Show item · supplier under each lot number (off when the list is already item-scoped). */
  showContext?: boolean;
  size?: 'small' | 'medium';
  sx?: object;
}

/** Searchable Lot No. dropdown; blank = All. Type "PATI-120" to narrow. */
export default function LotFilter({ value, onChange, options, label = 'Lot No.', showContext = true, size = 'small', sx }: Props) {
  const { itemName, supplierName } = useLookups();
  const selected = options.find((l) => l.id === value) ?? null;
  return (
    <Autocomplete
      size={size}
      options={options}
      value={selected}
      onChange={(_, v) => onChange(v?.id ?? '')}
      getOptionLabel={(l) => l.lotNumber}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.trim().toLowerCase();
        return q ? opts.filter((l) => l.lotNumber.toLowerCase().includes(q)) : opts;
      }}
      noOptionsText="No lots match"
      renderOption={(props, l) => (
        <Box component="li" {...props} key={l.id} sx={{ display: 'block !important' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.lotNumber}</Typography>
          {showContext && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {itemName(l.itemId)} · {supplierName(l.supplierId)} · {l.weightAvailable} kg left
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder="All" InputLabelProps={{ ...params.InputLabelProps, shrink: true }} />
      )}
      sx={{ minWidth: 220, ...sx }}
    />
  );
}
