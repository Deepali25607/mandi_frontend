import { useMemo, useState } from 'react';
import { useGetArrivalsQuery, useGetStockLotsQuery } from '@/api/operationsApi';
import LotFilter, { useLotFilter } from '@/components/common/LotFilter';
import { useLookups } from '@/utils/useLookups';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

/** Bilty vs Commission label; older arrivals (pre-feature) count as Bilty. */
export const purchaseTypeLabel = (t?: string) => (t === 'commission' ? 'Commission' : 'Bilty');

export const PURCHASE_TYPE_OPTIONS = [
  { value: 'bilty', label: 'Bilty' },
  { value: 'commission', label: 'Commission' },
];

export function PurchaseRegisterReport() {
  const { data: arrivals, isLoading } = useGetArrivalsQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { suppliers, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Arrival No.' },
    { key: 'type', label: 'Purchase Type' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'value', label: 'Value', currency: true, total: true },
  ];

  const preArrivals = useMemo(() => (arrivals ?? [])
    .filter((a) =>
      inRange(a.date, from, to) &&
      (!supplierId || a.supplierId === supplierId) &&
      (!purchaseType || (a.purchaseType ?? 'bilty') === purchaseType)), [arrivals, from, to, supplierId, purchaseType]);
  // Each arrival line spawned one lot — the dropdown offers the lots of the arrivals in view.
  const lotOptions = useMemo(() => {
    const ids = new Set(preArrivals.map((a) => a.id));
    return (lots ?? []).filter((l) => ids.has(l.arrivalId));
  }, [lots, preArrivals]);
  const { lotId, setLotId, options: lotChoices } = useLotFilter(lotOptions);
  const selectedLot = lotChoices.find((l) => l.id === lotId);

  const rows: ReportRow[] = useMemo(() => preArrivals
    .filter((a) => !selectedLot || a.id === selectedLot.arrivalId)
    .map((a) => ({
      date: a.date, no: a.arrivalNumber, type: purchaseTypeLabel(a.purchaseType), supplier: supplierName(a.supplierId), vehicle: a.vehicleNumber ?? '',
      lot: (a.lines ?? []).map((l) => l.lotNumber).join(', '),
      qty: a.totalQuantity, weight: a.totalWeight, value: a.totalValue,
    })), [preArrivals, selectedLot, supplierName]);

  return (
    <ReportShell
      title="Purchase Register" description="Goods received (arrivals) from suppliers."
      meta={`${from} to ${to}${selectedLot ? ` · lot ${selectedLot.lotNumber}` : ''}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Purchase type" value={purchaseType} onChange={setPurchaseType} options={PURCHASE_TYPE_OPTIONS} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        <LotFilter value={lotId} onChange={setLotId} options={lotChoices} />
      </>}
    />
  );
}

export function PurchaseTypeReport() {
  const { data: arrivals, isLoading } = useGetArrivalsQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { suppliers, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [purchaseType, setPurchaseType] = useState('');
  const [supplierId, setSupplierId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Arrival No.' },
    { key: 'type', label: 'Purchase Type' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'qty', label: 'Qty', numeric: true, total: true },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'value', label: 'Value', currency: true, total: true },
  ];

  const preArrivals = useMemo(() => (arrivals ?? [])
    .filter((a) =>
      inRange(a.date, from, to) &&
      (!supplierId || a.supplierId === supplierId) &&
      (!purchaseType || (a.purchaseType ?? 'bilty') === purchaseType)), [arrivals, from, to, supplierId, purchaseType]);
  const lotOptions = useMemo(() => {
    const ids = new Set(preArrivals.map((a) => a.id));
    return (lots ?? []).filter((l) => ids.has(l.arrivalId));
  }, [lots, preArrivals]);
  const { lotId, setLotId, options: lotChoices } = useLotFilter(lotOptions);
  const selectedLot = lotChoices.find((l) => l.id === lotId);

  const rows: ReportRow[] = useMemo(() => preArrivals
    .filter((a) => !selectedLot || a.id === selectedLot.arrivalId)
    .map((a) => ({
      date: a.date, no: a.arrivalNumber, type: purchaseTypeLabel(a.purchaseType), supplier: supplierName(a.supplierId),
      lot: (a.lines ?? []).map((l) => l.lotNumber).join(', '),
      qty: a.totalQuantity, weight: a.totalWeight, value: a.totalValue,
    })), [preArrivals, selectedLot, supplierName]);

  const counts = useMemo(() => {
    const c = { bilty: 0, commission: 0 };
    for (const r of rows) {
      if (r.type === 'Commission') c.commission++;
      else c.bilty++;
    }
    return c;
  }, [rows]);

  return (
    <ReportShell
      title="Purchase Type Register"
      description="Arrivals split by purchase type — Bilty (outright, rate mandatory) vs Commission (consignment)."
      meta={`${from} to ${to} · ${counts.bilty} Bilty · ${counts.commission} Commission${selectedLot ? ` · lot ${selectedLot.lotNumber}` : ''}`}
      columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Purchase type" value={purchaseType} onChange={setPurchaseType} options={PURCHASE_TYPE_OPTIONS} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        <LotFilter value={lotId} onChange={setLotId} options={lotChoices} />
      </>}
    />
  );
}

export function ItemWisePurchaseReport() {
  const { data: arrivals, isLoading } = useGetArrivalsQuery();
  const { items, itemName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [itemId, setItemId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');

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
      if (purchaseType && (a.purchaseType ?? 'bilty') !== purchaseType) continue;
      for (const l of a.lines ?? []) {
        if (itemId && l.itemId !== itemId) continue;
        const cur = agg.get(l.itemId) ?? { qty: 0, weight: 0, value: 0 };
        cur.qty += l.quantity; cur.weight += l.weight; cur.value += l.amount;
        agg.set(l.itemId, cur);
      }
    }
    return [...agg.entries()].map(([id, v]) => ({ item: itemName(id), ...v })).sort((a, b) => b.value - a.value);
  }, [arrivals, from, to, itemId, purchaseType, itemName]);

  return (
    <ReportShell
      title="Item-wise Purchase" description="Quantity, weight and value purchased per item."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Purchase type" value={purchaseType} onChange={setPurchaseType} options={PURCHASE_TYPE_OPTIONS} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
      </>}
    />
  );
}
