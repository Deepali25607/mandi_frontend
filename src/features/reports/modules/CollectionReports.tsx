import { useMemo, useState } from 'react';
import { useGetCollectionsQuery } from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import {
  DateRangeFilter, FilterSelect, ReportShell, inRange, useMonthRange,
  type ReportColumn, type ReportRow,
} from '../shared';

export function CollectionRegisterReport() {
  const { data: collections, isLoading } = useGetCollectionsQuery();
  const { customers, customerName } = useLookups();
  const { from, to, setFrom, setTo } = useMonthRange();
  const [customerId, setCustomerId] = useState('');

  const columns: ReportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'no', label: 'Receipt No.' },
    { key: 'customer', label: 'Customer' },
    { key: 'mode', label: 'Mode' },
    { key: 'reference', label: 'Reference' },
    { key: 'amount', label: 'Amount', currency: true, total: true },
  ];

  const rows: ReportRow[] = useMemo(() => (collections ?? [])
    .filter((c) => inRange(c.date, from, to) && (!customerId || c.customerId === customerId))
    .map((c) => ({
      date: c.date, no: c.collectionNumber, customer: customerName(c.customerId),
      mode: c.paymentMode, reference: c.reference ?? '', amount: c.amount,
    })), [collections, from, to, customerId, customerName]);

  return (
    <ReportShell
      title="Collection Register" description="Customer payments received (ugrahi)."
      meta={`${from} to ${to}`} columns={columns} rows={rows} loading={isLoading}
      filters={<>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <FilterSelect label="Customer" value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
      </>}
    />
  );
}
