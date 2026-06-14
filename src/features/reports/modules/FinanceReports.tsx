import { useMemo, useState } from 'react';
import { useGetExpensesQuery, useGetSupplierBillsQuery, useGetSupplierPaymentsQuery } from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

export function SupplierBillReport() {
  const { data: bills, isLoading } = useGetSupplierBillsQuery();
  const { suppliers, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Bill No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'period', label: 'Period' },
    { key: 'gross', label: 'Gross sales', currency: true, total: true },
    { key: 'deductions', label: 'Deductions', currency: true, total: true },
    { key: 'net', label: 'Net payable', currency: true, total: true },
    { key: 'status', label: 'Status' },
  ];
  const rows: ReportRow[] = useMemo(() => (bills ?? [])
    .filter((b) => inRange(b.date, from, to) && (!supplierId || b.supplierId === supplierId))
    .map((b) => ({
      date: b.date, no: b.billNumber, supplier: supplierName(b.supplierId), period: `${b.fromDate}→${b.toDate}`,
      gross: b.grossSales,
      deductions: b.commissionAmount + b.marketFeeAmount + b.labourCharges + b.crateCharges + b.otherCharges,
      net: b.netPayable, status: b.status,
    })), [bills, from, to, supplierId, supplierName]);

  return (
    <ReportShell
      title="Supplier Bills" description="Generated settlement bills with deductions and net payable."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
      </>}
    />
  );
}

export function SupplierPaymentReport() {
  const { data: payments, isLoading } = useGetSupplierPaymentsQuery();
  const { suppliers, supplierName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [supplierId, setSupplierId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Payment No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'mode', label: 'Mode' },
    { key: 'reference', label: 'Reference' },
    { key: 'amount', label: 'Amount', currency: true, total: true },
  ];
  const rows: ReportRow[] = useMemo(() => (payments ?? [])
    .filter((p) => inRange(p.date, from, to) && (!supplierId || p.supplierId === supplierId))
    .map((p) => ({
      date: p.date, no: p.paymentNumber, supplier: supplierName(p.supplierId),
      mode: p.paymentMode, reference: p.reference ?? '', amount: p.amount,
    })), [payments, from, to, supplierId, supplierName]);

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
