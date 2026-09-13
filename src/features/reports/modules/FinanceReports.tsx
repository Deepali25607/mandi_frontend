import { useMemo, useState } from 'react';
import { useGetExpensesQuery, useGetSupplierBillsQuery, useGetSupplierPaymentsQuery } from '@/api/financeApi';
import { useGetStockLotsQuery } from '@/api/operationsApi';
import LotFilter, { lotsFromIds, useLotFilter } from '@/components/common/LotFilter';
import { useLookups } from '@/utils/useLookups';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

export function SupplierBillReport() {
  const { data: bills, isLoading } = useGetSupplierBillsQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { suppliers, supplierName, itemName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');
  const lotById = useMemo(() => new Map((lots ?? []).map((l) => [l.id, l])), [lots]);

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Bill No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'period', label: 'Period' },
    { key: 'scope', label: 'Scope' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'gross', label: 'Gross sales', currency: true, total: true },
    { key: 'deductions', label: 'Deductions', currency: true, total: true },
    { key: 'net', label: 'Net payable', currency: true, total: true },
    { key: 'status', label: 'Status' },
  ];
  const preBills = useMemo(() => (bills ?? [])
    .filter((b) => inRange(b.date, from, to) && (!supplierId || b.supplierId === supplierId)), [bills, from, to, supplierId]);
  // Only lot-wise bills carry a lot; the dropdown offers those lots.
  const lotOptions = useMemo(() => lotsFromIds(preBills.map((b) => b.lotId), lotById), [preBills, lotById]);
  const { lotId, setLotId, options: lotChoices } = useLotFilter(lotOptions);

  const rows: ReportRow[] = useMemo(() => preBills
    .filter((b) => !lotId || b.lotId === lotId)
    .map((b) => ({
      date: b.date, no: b.billNumber, supplier: supplierName(b.supplierId), period: `${b.fromDate}→${b.toDate}`,
      scope: b.lotId ? 'Lot' : b.itemId ? `Item · ${itemName(b.itemId)}` : 'All items',
      lot: b.lotId ? lotById.get(b.lotId)?.lotNumber ?? '—' : '',
      gross: b.grossSales,
      deductions: b.commissionAmount + b.marketFeeAmount + b.labourCharges + b.crateCharges + b.otherCharges,
      net: b.netPayable, status: b.status,
    })), [preBills, lotId, lotById, supplierName, itemName]);

  return (
    <ReportShell
      title="Supplier Bills" description="Generated settlement bills with deductions and net payable."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      lotColumnKey="lot"
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        <LotFilter value={lotId} onChange={setLotId} options={lotChoices} />
      </>}
    />
  );
}

export function SupplierPaymentReport() {
  const { data: payments, isLoading } = useGetSupplierPaymentsQuery();
  const { data: bills } = useGetSupplierBillsQuery();
  const { data: lots } = useGetStockLotsQuery();
  const { suppliers, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');
  const billNo = useMemo(() => new Map((bills ?? []).map((b) => [b.id, b.billNumber])), [bills]);
  const lotNo = useMemo(() => new Map((lots ?? []).map((l) => [l.id, l.lotNumber])), [lots]);

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Payment No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'type', label: 'Type' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'bill', label: 'Bill' },
    { key: 'mode', label: 'Mode' },
    { key: 'reference', label: 'Reference' },
    { key: 'amount', label: 'Amount', currency: true, total: true },
  ];
  const rows: ReportRow[] = useMemo(() => (payments ?? [])
    .filter((p) => inRange(p.date, from, to) && (!supplierId || p.supplierId === supplierId))
    .map((p) => ({
      date: p.date, no: p.paymentNumber, supplier: supplierName(p.supplierId),
      type: p.lotId ? (p.billId ? 'Advance · adjusted' : 'Advance') : p.billId ? 'Against bill' : 'On account',
      lot: p.lotId ? lotNo.get(p.lotId) ?? '—' : '',
      bill: p.billId ? billNo.get(p.billId) ?? '—' : '',
      mode: p.paymentMode, reference: p.reference ?? '', amount: p.amount,
    })), [payments, from, to, supplierId, supplierName, lotNo, billNo]);

  return (
    <ReportShell
      title="Supplier Payments" description="Payments made to suppliers."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
      </>}
    />
  );
}

const EXPENSE_CATEGORIES = ['labour', 'transport', 'electricity', 'rent', 'miscellaneous'];

export function ExpenseRegisterReport() {
  const { data: expenses, isLoading } = useGetExpensesQuery();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [category, setCategory] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Voucher' },
    { key: 'category', label: 'Category' },
    { key: 'mode', label: 'Mode' },
    { key: 'notes', label: 'Notes' },
    { key: 'amount', label: 'Amount', currency: true, total: true },
  ];
  const rows: ReportRow[] = useMemo(() => (expenses ?? [])
    .filter((e) => inRange(e.date, from, to) && (!category || e.category === category))
    .map((e) => ({
      date: e.date, no: e.expenseNumber, category: e.category, mode: e.paymentMode, notes: e.notes ?? '', amount: e.amount,
    })), [expenses, from, to, category]);

  return (
    <ReportShell
      title="Expense Register" description="Operating expenses by category."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Category" value={category} onChange={setCategory} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
      </>}
    />
  );
}
