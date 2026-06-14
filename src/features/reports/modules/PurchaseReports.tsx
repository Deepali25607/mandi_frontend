import { useMemo, useState } from 'react';
import { useGetArrivalsQuery } from '@/api/operationsApi';
import { useLookups } from '@/utils/useLookups';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

export function PurchaseRegisterReport() {
  const { data: arrivals, isLoading } = useGetArrivalsQuery();
  const { suppliers, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Arrival No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'value', label: 'Value', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => (arrivals ?? [])
    .filter((a) => inRange(a.date, from, to) && (!supplierId || a.supplierId === supplierId))
    .map((a) => ({
      date: a.date, no: a.arrivalNumber, supplier: supplierName(a.supplierId), vehicle: a.vehicleNumber ?? '',
      qty: a.totalQuantity, weight: a.totalWeight, value: a.totalValue,
    })), [arrivals, from, to, supplierId, supplierName]);

  return (
    <ReportShell
      title="Purchase Register" description="Goods received (arrivals) from suppliers."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
      </>}
    />
  );
}

export function ItemWisePurchaseReport() {
  const { data: arrivals, isLoading } = useGetArrivalsQuery();
  const { items, itemName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [itemId, setItemId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'value', label: 'Value', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => {
    const agg = new Map<string, { qty: number; weight: number; value: number }>();
    for (const a of arrivals ?? []) {
      if (!inRange(a.date, from, to)) continue;
      for (const l of a.lines ?? []) {
        if (itemId && l.itemId !== itemId) continue;
        const cur = agg.get(l.itemId) ?? { qty: 0, weight: 0, value: 0 };
        cur.qty += l.quantity; cur.weight += l.weight; cur.value += l.amount;
        agg.set(l.itemId, cur);
      }
    }
    return [...agg.entries()].map(([id, v]) => ({ item: itemName(id), ...v })).sort((a, b) => b.value - a.value);
  }, [arrivals, from, to, itemId, itemName]);

  return (
    <ReportShell
      title="Item-wise Purchase" description="Quantity, weight and value purchased per item."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
      </>}
    />
  );
}
