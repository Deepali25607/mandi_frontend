import { useMemo, useState } from 'react';
import { useGetStockLotsQuery, useGetStockSummaryQuery } from '@/api/operationsApi';
import { useLookups } from '@/utils/useLookups';
import { FilterSelect, ReportShell, type ReportColumn, type ReportRow } from '../shared';

export function StockSummaryReport() {
  const { data: summary, isLoading } = useGetStockSummaryQuery();

  const columns: ReportColumn[] = [
    { key: 'item', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'lots', label: 'Lots', numeric: true, total: true },
    { key: 'qty', label: 'Qty avail.', numeric: true, total: true },
    { key: 'weight', label: 'Weight avail. (kg)', numeric: true, total: true },
    { key: 'value', label: 'Stock value', currency: true, total: true },
  ];

  const rows: ReportRow[] = (summary ?? []).map((r) => ({
    item: r.itemName, category: r.category, lots: r.lots,
    qty: r.qtyAvailable, weight: r.weightAvailable, value: r.stockValue,
  }));

  return (
    <ReportShell
      title="Stock Summary" description="Available stock and value by item."
      columns={columns} rows={rows} loading={isLoading}
    />
  );
}

export function StockLotReport() {
  const { data: lots, isLoading } = useGetStockLotsQuery();
  const { items, suppliers, itemName, supplierName } = useLookups();
  const [itemId, setItemId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('');

  const columns: ReportColumn[] = [
    { key: 'lot', label: 'Lot No.' },
    { key: 'date', label: 'Date' },
    { key: 'item', label: 'Item' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'rate', label: 'Rate', currency: true },
    { key: 'qtyArr', label: 'Qty in', numeric: true, total: true },
    { key: 'qtyAvail', label: 'Qty avail.', numeric: true, total: true },
    { key: 'wtArr', label: 'Weight in', numeric: true, total: true },
    { key: 'wtAvail', label: 'Weight avail.', numeric: true, total: true },
    { key: 'value', label: 'Stock value', currency: true, total: true },
    { key: 'status', label: 'Status' },
  ];

  const rows: ReportRow[] = useMemo(() => (lots ?? [])
    .filter((l) =>
      (!itemId || l.itemId === itemId) &&
      (!supplierId || l.supplierId === supplierId) &&
      (!status || l.status === status),
    )
    .map((l) => ({
      lot: l.lotNumber, date: l.date, item: itemName(l.itemId), supplier: supplierName(l.supplierId),
      rate: l.rate, qtyArr: l.qtyArrived, qtyAvail: l.qtyAvailable,
      wtArr: l.weightArrived, wtAvail: l.weightAvailable,
      // Value of stock still on hand for this lot (available weight × cost rate).
      value: Math.round(l.weightAvailable * l.rate * 100) / 100,
      status: l.status,
    })), [lots, itemId, supplierId, status, itemName, supplierName]);

  return (
    <ReportShell
      title="Stock Lot Register" description="Lot-wise inventory with drawdown, on-hand value and status."
      columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }]} />
      </>}
    />
  );
}

export function ItemMasterReport() {
  const { items } = useLookups();
  const columns: ReportColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'unit', label: 'Unit' },
    { key: 'commission', label: 'Default commission %', numeric: true },
    { key: 'fee', label: 'Default market fee %', numeric: true },
    { key: 'status', label: 'Status' },
  ];
  const rows: ReportRow[] = items.map((i) => ({
    code: i.code, name: i.name, category: i.category, unit: i.unit,
    commission: i.defaultCommissionPct, fee: i.defaultMarketFeePct, status: i.isActive ? 'Active' : 'Inactive',
  }));
  return <ReportShell title="Item Master" description="All items with default commission and market fee." columns={columns} rows={rows} />;
}
