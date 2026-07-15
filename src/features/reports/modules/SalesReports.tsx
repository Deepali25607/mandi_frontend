import { useMemo, useState } from 'react';
import { useGetSalesQuery, useGetStockLotsQuery } from '@/api/operationsApi';
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

  // Customer-facing register: the buyer is billed the gross, so Net Amount is
  // the gross with nothing deducted. Commission / market fee are supplier-side
  // deductions and are never shown here (see the Supplier-wise Sales report).
  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Invoice' },
    { key: 'customer', label: 'Customer' },
    { key: 'mode', label: 'Mode' },
    { key: 'net', label: 'Net Amount', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => (sales ?? [])
    .filter((s) => inRange(s.date, from, to) && (!customerId || s.customerId === customerId))
    .map((s) => ({
      date: s.date, no: s.saleNumber, customer: customerName(s.customerId), mode: s.paymentMode,
      net: s.grossAmount,
    })), [sales, from, to, customerId, customerName]);

  return (
    <ReportShell
      title="Sales Register" description="All sales (invoices) with the amount billed to each customer."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Customer" value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
      </>}
    />
  );
}

export function SaleItemRegisterReport() {
  const { data: sales, isLoading } = useGetSalesQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { items, customers, itemName, customerName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [customerId, setCustomerId] = useState('');
  const [itemId, setItemId] = useState('');

  const lotNumber = useMemo(() => {
    const m = new Map((lots ?? []).map((l) => [l.id, l.lotNumber]));
    return (id: string | null) => (id ? m.get(id) ?? '—' : '—');
  }, [lots]);

  // Customer-facing line register — same rule as the Sales Register: the buyer
  // is billed the gross, so no commission / market fee is shown here.
  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Invoice' },
    { key: 'customer', label: 'Customer' },
    { key: 'item', label: 'Item' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'rate', label: 'Rate', currency: true },
    { key: 'net', label: 'Net Amount', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => (sales ?? [])
    .filter((s) => inRange(s.date, from, to) && (!customerId || s.customerId === customerId))
    .flatMap((s) =>
      (s.lines ?? [])
        .filter((l) => !itemId || l.itemId === itemId)
        .map((l) => ({
          date: s.date, no: s.saleNumber, customer: customerName(s.customerId),
          item: itemName(l.itemId), lot: lotNumber(l.lotId),
          qty: l.quantity, weight: l.weight, rate: l.rate,
          net: l.grossAmount,
        })),
    ), [sales, from, to, customerId, itemId, customerName, itemName, lotNumber]);

  return (
    <ReportShell
      title="Sale Item Register" description="Every item line sold — with lot, quantity, rate and value."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Customer" value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
      </>}
    />
  );
}

export function SupplierSaleRegisterReport() {
  const { data: sales, isLoading } = useGetSalesQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { items, suppliers, itemName, supplierName, customerName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');
  const [itemId, setItemId] = useState('');

  const lotById = useMemo(() => new Map((lots ?? []).map((l) => [l.id, l])), [lots]);

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Invoice' },
    { key: 'customer', label: 'Customer' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'item', label: 'Item' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'rate', label: 'Rate', currency: true },
    { key: 'gross', label: 'Gross', currency: true, total: true },
    { key: 'commission', label: 'Commission', currency: true, total: true },
    { key: 'fee', label: 'Market Fee', currency: true, total: true },
    { key: 'net', label: 'Net payable', currency: true, total: true },
  ];

  // Only lot-linked sale lines are attributable to a supplier (via the lot).
  const rows: ReportRow[] = useMemo(() => (sales ?? [])
    .filter((s) => inRange(s.date, from, to))
    .flatMap((s) =>
      (s.lines ?? [])
        .map((l) => ({ line: l, lot: l.lotId ? lotById.get(l.lotId) : undefined }))
        .filter(({ lot }) => lot && (!supplierId || lot.supplierId === supplierId))
        .filter(({ line }) => !itemId || line.itemId === itemId)
        .map(({ line, lot }) => ({
          date: s.date, no: s.saleNumber, customer: customerName(s.customerId),
          supplier: supplierName(lot!.supplierId),
          item: itemName(line.itemId), lot: lot!.lotNumber,
          qty: line.quantity, weight: line.weight, rate: line.rate,
          gross: line.grossAmount, commission: line.commissionAmount, fee: line.marketFeeAmount, net: line.netAmount,
        })),
    ), [sales, lotById, from, to, supplierId, itemId, supplierName, itemName, customerName]);

  return (
    <ReportShell
      title="Supplier-wise Sales" description="Sold-lot lines attributed to each supplier, with net payable."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
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
