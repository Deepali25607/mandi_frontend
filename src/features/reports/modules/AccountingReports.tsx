import { useState } from 'react';
import {
  useGetCashBookQuery,
  useGetCustomerLedgerQuery,
  useGetSupplierLedgerQuery,
  useGetTrialBalanceQuery,
} from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { FilterSelect, ReportShell, type ReportColumn, type ReportRow } from '../shared';

export function TrialBalanceReport() {
  const { data, isLoading } = useGetTrialBalanceQuery();
  const columns: ReportColumn[] = [
    { key: 'account', label: 'Account' },
    { key: 'debit', label: 'Debit', currency: true, total: true },
    { key: 'credit', label: 'Credit', currency: true, total: true },
  ];
  const rows: ReportRow[] = (data?.rows ?? []).map((r) => ({ account: r.account, debit: r.debit, credit: r.credit }));
  return (
    <ReportShell
      title="Trial Balance" description="Summary of account balances (derived ledger)."
      columns={columns} rows={rows} loading={isLoading}
    />
  );
}

function CashOrBank({ kind }: { kind: 'cash' | 'bank' }) {
  const { data, isLoading } = useGetCashBookQuery(kind);
  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'inflow', label: 'Inflow', currency: true, total: true },
    { key: 'outflow', label: 'Outflow', currency: true, total: true },
    { key: 'balance', label: 'Balance', currency: true },
  ];
  const rows: ReportRow[] = (data?.rows ?? []).map((r) => ({
    date: r.date, voucher: r.voucher, particulars: r.particulars, inflow: r.inflow, outflow: r.outflow, balance: r.balance,
  }));
  const title = kind === 'cash' ? 'Cash Book' : 'Bank Book';
  return (
    <ReportShell
      title={title} description={`${kind === 'cash' ? 'Cash' : 'Bank'} inflows and outflows with running balance.`}
      meta={data ? `Closing balance: ${data.balance}` : undefined}
      columns={columns} rows={rows} loading={isLoading}
    />
  );
}

export function CashBookReport() { return <CashOrBank kind="cash" />; }
export function BankBookReport() { return <CashOrBank kind="bank" />; }

const LEDGER_COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'voucher', label: 'Voucher' },
  { key: 'particulars', label: 'Particulars' },
  { key: 'debit', label: 'Debit', currency: true, total: true },
  { key: 'credit', label: 'Credit', currency: true, total: true },
  { key: 'balance', label: 'Balance', currency: true },
];

export function CustomerLedgerReport() {
  const { customers } = useLookups();
  const [customerId, setCustomerId] = useState('');
  const { data, isFetching } = useGetCustomerLedgerQuery(customerId, { skip: !customerId });
  const rows: ReportRow[] = (data?.rows ?? []).map((r) => ({
    date: r.date, voucher: r.voucher, particulars: r.particulars, debit: r.debit, credit: r.credit, balance: r.balance,
  }));
  return (
    <ReportShell
      title="Customer Ledger" description={data ? `Ledger for ${data.name}` : 'Sales (Dr) and receipts (Cr) per customer.'}
      meta={data ? `Closing balance: ${data.balance}` : undefined}
      columns={LEDGER_COLUMNS} rows={rows} loading={isFetching}
      emptyText={customerId ? 'No ledger entries.' : 'Select a customer to view their ledger.'}
      filters={<FilterSelect label="Customer" value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} allLabel="— Select —" />}
    />
  );
}

export function SupplierLedgerReport() {
  const { suppliers } = useLookups();
  const [supplierId, setSupplierId] = useState('');
  const { data, isFetching } = useGetSupplierLedgerQuery(supplierId, { skip: !supplierId });
  const rows: ReportRow[] = (data?.rows ?? []).map((r) => ({
    date: r.date, voucher: r.voucher, particulars: r.particulars, debit: r.debit, credit: r.credit, balance: r.balance,
  }));
  return (
    <ReportShell
      title="Supplier Ledger" description={data ? `Ledger for ${data.name}` : 'Bills (Cr) and payments (Dr) per supplier.'}
      meta={data ? `Closing balance: ${data.balance}` : undefined}
      columns={LEDGER_COLUMNS} rows={rows} loading={isFetching}
      emptyText={supplierId ? 'No ledger entries.' : 'Select a supplier to view their ledger.'}
      filters={<FilterSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} allLabel="— Select —" />}
    />
  );
}
