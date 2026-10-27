import { useMemo, useState } from 'react';
import { useGetSalesQuery, useGetStockLotsQuery } from '@/api/operationsApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';
import { purchaseTypeLabel, PURCHASE_TYPE_OPTIONS } from './PurchaseReports';
import LotFilter, { lotsFromIds, useLotFilter } from '@/components/common/LotFilter';

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
    { key: 'lot', label: 'Lot No.' },
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

  const preRows = useMemo(() => (sales ?? [])
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
          const type = lot!.purchaseType ?? 'bilty';
          const billed = line.grossAmount;                   // sales value (customer rate × weight)
          const base = line.weight > 0 ? line.weight : line.quantity;
          let suppRate: number;
          let suppValue: number;
          let net: number;
          if (type === 'bilty') {
            // Bilty (outright): the supplier rate/value come from the ORIGINAL
            // arrival purchase rate (lot.rate) — NEVER the sale rate. Margin is the
            // real buy→sell spread, and the supplier is owed the purchase cost.
            const purchaseRate = lot!.rate ?? 0;
            suppRate = purchaseRate;
            suppValue = round2(base * purchaseRate);
            net = suppValue;
          } else {
            // Commission: supplier entitlement comes from the sale (dual rate when
            // the owner set one), settled at the stored net (sales − commission − fee).
            suppValue = line.supplierGrossAmount ?? line.grossAmount;
            suppRate = line.supplierRate ?? line.rate;
            net = line.netAmount;
          }
          const margin = round2(billed - suppValue);
          const commission = line.commissionAmount;
          const fee = line.marketFeeAmount;
          return {
            lotId: lot!.id,
            // A "dual-rate" line is one where the owner set an explicit supplier
            // rate (Commission lots only) — not a Bilty buy→sell spread.
            isDual: line.supplierRate != null,
            row: {
              date: s.date, no: s.saleNumber,
              supplier: supplierName(lot!.supplierId),
              item: itemName(line.itemId),
              lot: lot!.lotNumber,
              type: purchaseTypeLabel(lot!.purchaseType),
              weight: line.weight,
              custRate: line.rate,
              suppRate,
              billed,
              suppValue,
              margin,
              commission,
              fee,
              earning: round2(margin + commission + fee),
              net,
            } as ReportRow,
          };
        }),
    ), [sales, lotById, from, to, supplierId, itemId, purchaseType, rateMode, supplierName, itemName]);
  const lotOptions = useMemo(() => lotsFromIds(preRows.map((r) => r.lotId), lotById), [preRows, lotById]);
  const { lotId, setLotId, options: lotChoices } = useLotFilter(lotOptions);
  const filteredPre = useMemo(
    () => preRows.filter((r) => !lotId || r.lotId === lotId),
    [preRows, lotId],
  );
  const rows: ReportRow[] = useMemo(() => filteredPre.map((r) => r.row), [filteredPre]);

  const profit = rows.reduce((s, r) => s + Number(r.earning), 0);
  const dualCount = filteredPre.filter((r) => r.isDual).length;

  return (
    <ReportShell
      title="Supplier Rate & Margin (Internal)"
      description="Confidential owner's ledger: customer vs supplier rate per sold lot line, with margin, commission and total earnings. Supplier settlements use the Supplier net column."
      meta={`${from} to ${to} · ${dualCount} dual-rate line(s) · total earning ${formatCurrency(profit, false)}`}
      columns={columns} rows={rows} loading={isLoading}
      lotColumnKey="lot"
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((sp) => ({ value: sp.id, label: sp.name }))} />
        <FilterSelect label="Item" value={itemId} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
        <FilterSelect label="Purchase type" value={purchaseType} onChange={setPurchaseType} options={PURCHASE_TYPE_OPTIONS} />
        <FilterSelect label="Rate mode" value={rateMode} onChange={setRateMode} options={[{ value: 'dual', label: 'Dual rate only' }, { value: 'single', label: 'Single rate only' }]} />
        <LotFilter value={lotId} onChange={setLotId} options={lotChoices} />
      </>}
    />
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
