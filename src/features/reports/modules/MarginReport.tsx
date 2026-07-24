import { useMemo, useState } from 'react';
import { useGetSalesQuery, useGetStockLotsQuery } from '@/api/operationsApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';
import { purchaseTypeLabel, PURCHASE_TYPE_OPTIONS } from './PurchaseReports';

/**
 * CONFIDENTIAL — Org Admin only (enforced in the reports registry + runner;
 * the API additionally strips supplier rates from every non-admin response).
 *
 * The owner's private ledger of dual-rate trading: what each sold lot line was
 * billed at (customer rate), what the supplier is actually owed (supplier
 * rate), and everything earned on the line — margin + commission + market fee.
 * This report is never part of any customer-facing output.
 */
export function SupplierRateMarginReport() {
  const { data: sales, isLoading } = useGetSalesQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { items, suppliers, itemName, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');
  const [itemId, setItemId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [rateMode, setRateMode] = useState('');

  const lotById = useMemo(() => new Map((lots ?? []).map((l) => [l.id, l])), [lots]);

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Invoice' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'item', label: 'Item' },
    { key: 'type', label: 'Purchase Type' },
    { key: 'weight', label: 'Weight (kg)', numeric: true, total: true },
    { key: 'custRate', label: 'Cust. Rate', currency: true },
    { key: 'suppRate', label: 'Supp. Rate', currency: true },
    { key: 'billed', label: 'Billed (customer)', currency: true, total: true },
    { key: 'suppValue', label: 'Supplier value', currency: true, total: true },
    { key: 'margin', label: 'Margin', currency: true, total: true },
    { key: 'commission', label: 'Commission', currency: true, total: true },
    { key: 'fee', label: 'Market Fee', currency: true, total: true },
    { key: 'earning', label: 'Total earning', currency: true, total: true },
    { key: 'net', label: 'Supplier net (to settle)', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => (sales ?? [])
    .filter((s) => inRange(s.date, from, to))
    .flatMap((s) =>
      (s.lines ?? [])
        .map((l) => ({ line: l, lot: l.lotId ? lotById.get(l.lotId) : undefined }))
        .filter(({ lot }) => lot && (!supplierId || lot.supplierId === supplierId))
        .filter(({ line }) => !itemId || line.itemId === itemId)
        .filter(({ lot }) => !purchaseType || (lot!.purchaseType ?? 'bilty') === purchaseType)
        .filter(({ line }) =>
          !rateMode ||
          (rateMode === 'dual' ? line.supplierRate != null : line.supplierRate == null))
        .map(({ line, lot }) => {
          const suppValue = line.supplierGrossAmount ?? line.grossAmount;
          const margin = line.grossAmount - suppValue;
          return {
            date: s.date, no: s.saleNumber,
            supplier: supplierName(lot!.supplierId),
            item: itemName(line.itemId),
            type: purchaseTypeLabel(lot!.purchaseType),
            weight: line.weight,
            custRate: line.rate,
            suppRate: line.supplierRate ?? line.rate,
            billed: line.grossAmount,
            suppValue,
            margin,
            commission: line.commissionAmount,
            fee: line.marketFeeAmount,
            earning: margin + line.commissionAmount + line.marketFeeAmount,
            net: line.netAmount,
          };
        }),
    ), [sales, lotById, from, to, supplierId, itemId, purchaseType, rateMode, supplierName, itemName]);

  const profit = rows.reduce((s, r) => s + Number(r.earning), 0);
  const dualCount = rows.filter((r) => Number(r.margin) !== 0).length;

  return (
    <ReportShell
      title="Supplier Rate & Margin (Internal)"
      description="Confidential owner's ledger: customer vs supplier rate per sold lot line, with margin, commission and total earnings. Supplier settlements use the Supplier net column."
      meta={`${from} to ${to} · ${dualCount} dual-rate line(s) · total earning ${formatCurrency(profit, false)}`}
      columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((sp) => ({ value: sp.id, label: sp.name }))} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
        <FilterSelect label="Purchase type" value={purchaseType} onChange={setPurchaseType} options={PURCHASE_TYPE_OPTIONS} />
        <FilterSelect label="Rate mode" value={rateMode} onChange={setRateMode} options={[{ value: 'dual', label: 'Dual rate only' }, { value: 'single', label: 'Single rate only' }]} />
      </>}
    />
  );
}
