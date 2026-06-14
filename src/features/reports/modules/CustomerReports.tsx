import { useGetCustomerOutstandingQuery } from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { ReportShell, type ReportColumn, type ReportRow } from '../shared';

export function CustomerOutstandingReport() {
  const { data, isLoading } = useGetCustomerOutstandingQuery();
  const columns: ReportColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Customer' },
    { key: 'area', label: 'Area' },
    { key: 'opening', label: 'Opening', currency: true, total: true },
    { key: 'sales', label: 'Sales', currency: true, total: true },
    { key: 'collected', label: 'Collected', currency: true, total: true },
    { key: 'balance', label: 'Receivable', currency: true, total: true },
  ];
  const rows: ReportRow[] = (data ?? []).map((r) => ({
    code: r.code, name: r.name, area: r.area ?? '', opening: r.opening, sales: r.sales, collected: r.collected, balance: r.balance,
  }));
  return (
    <ReportShell
      title="Customer Outstanding" description="Receivables per customer (opening + sales − collected)."
      columns={columns} rows={rows} loading={isLoading}
    />
  );
}

export function CustomerMasterReport() {
  const { customers } = useLookups();
  const columns: ReportColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'area', label: 'Area' },
    { key: 'gst', label: 'GST' },
    { key: 'credit', label: 'Credit limit', currency: true, total: true },
    { key: 'opening', label: 'Opening', currency: true, total: true },
    { key: 'status', label: 'Status' },
  ];
  const rows: ReportRow[] = customers.map((c) => ({
    code: c.code, name: c.name, mobile: c.mobile ?? '', area: c.area ?? '', gst: c.gstNumber ?? '',
    credit: c.creditLimit, opening: c.openingBalance, status: c.isActive ? 'Active' : 'Inactive',
  }));
  return (
    <ReportShell title="Customer Master" description="All customers with credit limits and balances." columns={columns} rows={rows} />
  );
}
