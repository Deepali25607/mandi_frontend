import { useMemo, useState } from 'react';
import { useGetItemsQuery, useGetPriceLogQuery } from '@/api/mastersApi';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

/** Complete audit trail of daily selling-price changes. */
export function PriceHistoryReport() {
  const { data: log, isLoading } = useGetPriceLogQuery();
  const { data: items } = useGetItemsQuery();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [itemId, setItemId] = useState('');

  const itemName = (id: string) => (items ?? []).find((i) => i.id === id)?.name ?? '—';

  const columns: ReportColumn[] = [
    { key: 'when', label: 'Date & Time' },
    { key: 'item', label: 'Item' },
    { key: 'previous', label: 'Old Price', currency: true },
    { key: 'price', label: 'New Price', currency: true },
    { key: 'change', label: 'Change', currency: true },
    { key: 'by', label: 'Updated By' },
    { key: 'notes', label: 'Notes' },
  ];

  const rows: ReportRow[] = useMemo(() => (log ?? [])
    .filter((r) => inRange(r.createdAt.slice(0, 10), from, to) && (!itemId || r.itemId === itemId))
    .map((r) => ({
      when: new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      item: itemName(r.itemId),
      previous: r.previousPrice ?? 0,
      price: r.price,
      change: r.previousPrice != null ? r.price - r.previousPrice : r.price,
      by: r.updatedBy,
      notes: r.notes ?? '',
    })), [log, from, to, itemId, items]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReportShell
      title="Price History"
      description="Every daily selling-price change: old and new rate, who updated it and when."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect
          label="Item" value={itemId} onChange={setItemId}
          options={(items ?? []).map((i) => ({ value: i.id, label: i.name }))}
        />
      </>}
    />
  );
}
