import { useMemo, useState } from 'react';
import { useGetSalesQuery } from '@/api/operationsApi';
import { useLookups } from '@/utils/useLookups';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

export function SalesRegisterReport() {
  const { data: sales, isLoading } = useGetSalesQuery();
  const { customers, customerName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [customerId, setCustomerId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Invoice' },
    { key: 'customer', label: 'Customer' },
    { key: 'mode', label: 'Mode' },
    { key: 'gross', label: 'Gross', currency: true, total: true },
    { key: 'commission', label: 'Commission', currency: true, total: true },
    { key: 'fee', label: 'Market Fee', currency: true, total: true },
    { key: 'net', label: 'Net (supplier)', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => (sales ?? [])
    .filter((s) => inRange(s.date, from, to) && (!customerId || s.customerId === customerId))
    .map((s) => ({
      date: s.date, no: s.saleNumber, customer: customerName(s.customerId), mode: s.paymentMode,
      gross: s.grossAmount, commission: s.commissionAmount, fee: s.marketFeeAmount, net: s.netAmount,
    })), [sales, from, to, customerId, customerName]);

  return (
    <ReportShell
      title="Sales Register" description="All sales (invoices) with commission and market fee."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Customer" value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
      </>}
    />
  );
}

export function ItemWiseSalesReport() {
  const { data: sales, isLoading } = useGetSalesQuery();
  const { items, itemName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [itemId, setItemId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'gross', label: 'Gross', currency: true, total: true },
    { key: 'commission', label: 'Commission', currency: true, total: true },
    { key: 'net', label: 'Net', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => {
    const agg = new Map<string, { qty: number; weight: number; gross: number; commission: number; net: number }>();
    for (const s of sales ?? []) {
      if (!inRange(s.date, from, to)) continue;
      for (const l of s.lines ?? []) {
        if (itemId && l.itemId !== itemId) continue;
        const cur = agg.get(l.itemId) ?? { qty: 0, weight: 0, gross: 0, commission: 0, net: 0 };
        cur.qty += l.quantity; cur.weight += l.weight; cur.gross += l.grossAmount;
        cur.commission += l.commissionAmount; cur.net += l.netAmount;
        agg.set(l.itemId, cur);
      }
    }
    return [...agg.entries()]
      .map(([id, v]) => ({ item: itemName(id), ...v }))
      .sort((a, b) => b.gross - a.gross);
  }, [sales, from, to, itemId, itemName]);

  return (
    <ReportShell
      title="Item-wise Sales" description="Quantity, weight and value sold per item."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
      </>}
    />
  );
}
