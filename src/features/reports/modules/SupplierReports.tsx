import { useGetSupplierOutstandingQuery } from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { ReportShell, type ReportColumn, type ReportRow } from '../shared';

export function SupplierOutstandingReport() {
  const { data, isLoading } = useGetSupplierOutstandingQuery();
  const columns: ReportColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Supplier' },
    { key: 'village', label: 'Village' },
    { key: 'opening', label: 'Opening', currency: true, total: true },
    { key: 'billed', label: 'Billed', currency: true, total: true },
    { key: 'paid', label: 'Paid', currency: true, total: true },
    { key: 'unbilled', label: 'Unbilled net', currency: true, total: true },
    { key: 'balance', label: 'Payable', currency: true, total: true },
  ];
  const rows: ReportRow[] = (data ?? []).map((r) => ({
    code: r.code, name: r.name, village: r.village ?? '', opening: r.opening,
    billed: r.billed, paid: r.paid, unbilled: r.unbilled, balance: r.balance,
  }));
  return (
    <ReportShell
      title="Supplier Outstanding" description="Payables per supplier, plus unbilled sale value to settle."
      columns={columns} rows={rows} loading={isLoading}
    />
  );
}

export function SupplierMasterReport() {
  const { suppliers } = useLookups();
  const columns: ReportColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'village', label: 'Village' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'commission', label: 'Commission %', numeric: true },
    { key: 'opening', label: 'Opening', currency: true, total: true },
    { key: 'status', label: 'Status' },
  ];
  const rows: ReportRow[] = suppliers.map((s) => ({
    code: s.code, name: s.name, village: s.village ?? '', mobile: s.mobile ?? '',
    commission: s.commissionRate, opening: s.openingBalance, status: s.isActive ? 'Active' : 'Inactive',
  }));
  return (
    <ReportShell title="Supplier Master" description="All suppliers with commission rates and balances." columns={columns} rows={rows} />
  );
}
