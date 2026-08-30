import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetCustomersQuery, useGetSuppliersQuery } from '@/api/mastersApi';
import { useGetSalesQuery } from '@/api/operationsApi';
import {
  useGetCollectionsQuery,
  useGetCustomerLedgerQuery,
  useGetCustomerOutstandingQuery,
  useGetOutstandingSummaryQuery,
  useGetSupplierBillsQuery,
  useGetSupplierLedgerQuery,
  useGetSupplierOutstandingQuery,
  useGetSupplierPaymentsQuery,
} from '@/api/financeApi';
import type { LedgerRow as ErpLedgerRow } from '@/types/finance';
import type { LedgerEntry, LedgerRow, Party, PartyType } from './types';
import type { PartySummary } from './utils';

/**
 * Data layer: projects the ERP's masters and finance documents into the
 * Khata shapes. Nothing here is mocked — every figure matches Outstanding,
 * Collections, Settlements and the Accounting ledgers.
 */

/** Active customers + suppliers as Khata parties (reminder dates merged in). */
export function useKhataParties(type?: PartyType): { parties: Party[]; isLoading: boolean } {
  const { data: customers, isLoading: lc } = useGetCustomersQuery();
  const { data: suppliers, isLoading: ls } = useGetSuppliersQuery();
  const reminders = useAppSelector((s) => s.khata.reminders);

  const parties = useMemo(() => {
    const cs: Party[] = (customers ?? [])
      .filter((c) => c.isActive)
      .map((c) => ({ id: c.id, code: c.code, name: c.name, phone: c.mobile || undefined, type: 'customer' as const, reminderDate: reminders[c.id] }));
    const ss: Party[] = (suppliers ?? [])
      .filter((s) => s.isActive)
      .map((s) => ({ id: s.id, code: s.code, name: s.name, phone: s.mobile || undefined, type: 'supplier' as const, reminderDate: reminders[s.id] }));
    const all = [...cs, ...ss];
    return type ? all.filter((p) => p.type === type) : all;
  }, [customers, suppliers, reminders, type]);

  return { parties, isLoading: lc || ls };
}

/**
 * Every party of a type with its real balance (from /outstanding) and the
 * date of its latest document, most-recent first.
 */
export function usePartySummaries(type: PartyType): { summaries: PartySummary[]; isLoading: boolean } {
  const { parties, isLoading: lp } = useKhataParties(type);
  const isCustomer = type === 'customer';

  const { data: custOut, isLoading: lco } = useGetCustomerOutstandingQuery(undefined, { skip: !isCustomer });
  const { data: supOut, isLoading: lso } = useGetSupplierOutstandingQuery(undefined, { skip: isCustomer });
  const { data: sales } = useGetSalesQuery(undefined, { skip: !isCustomer });
  const { data: collections } = useGetCollectionsQuery(undefined, { skip: !isCustomer });
  const { data: bills } = useGetSupplierBillsQuery(undefined, { skip: isCustomer });
  const { data: payments } = useGetSupplierPaymentsQuery(undefined, { skip: isCustomer });

  const summaries = useMemo(() => {
    const balance = new Map<string, number>();
    if (isCustomer) custOut?.forEach((r) => balance.set(r.customerId, r.balance));
    // Supplier outstanding is "we owe them" → negative in Khata terms.
    else supOut?.forEach((r) => balance.set(r.supplierId, -r.balance));

    const latest = new Map<string, string>();
    const count = new Map<string, number>();
    const touch = (id: string, date: string) => {
      count.set(id, (count.get(id) ?? 0) + 1);
      if (!latest.has(id) || date > (latest.get(id) as string)) latest.set(id, date);
    };
    if (isCustomer) {
      sales?.forEach((s) => { if (s.paymentMode === 'credit') touch(s.customerId, s.date); });
      collections?.forEach((c) => touch(c.customerId, c.date));
    } else {
      bills?.forEach((b) => touch(b.supplierId, b.date));
      payments?.forEach((p) => touch(p.supplierId, p.date));
    }

    return parties
      .map<PartySummary>((party) => ({
        party,
        balance: balance.get(party.id) ?? 0,
        lastActivity: latest.get(party.id),
        entryCount: count.get(party.id) ?? 0,
      }))
      .sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '') || a.party.name.localeCompare(b.party.name));
  }, [parties, isCustomer, custOut, supOut, sales, collections, bills, payments]);

  return { summaries, isLoading: lp || (isCustomer ? lco : lso) };
}

/** ERP documents carry a date only; parse as local midnight so no spurious time shows. */
const localDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);

/** Map one ERP ledger row (debit/credit) to a Khata entry for a customer or supplier. */
function toEntry(row: ErpLedgerRow, party: Party, idx: number, fallbackDate: string): LedgerRow {
  const isCustomer = party.type === 'customer';
  const opening = row.particulars === 'Opening balance';
  const isDebit = row.debit > 0;
  // Customer: debit = credit sale (we gave goods), credit = receipt (we got money).
  // Supplier: credit = bill/adjustment (we got goods → we owe), debit = payment (we gave money).
  let type: LedgerRow['type'] = isCustomer ? (isDebit ? 'gave' : 'got') : isDebit ? 'gave' : 'got';
  let amount = isDebit ? row.debit : row.credit;
  const balanceAfter = isCustomer ? row.balance : -row.balance;
  if (opening) {
    amount = Math.abs(balanceAfter);
    type = balanceAfter >= 0 ? 'gave' : 'got';
  }
  const p = row.particulars.toLowerCase();
  const source: LedgerRow['source'] = opening ? 'opening'
    : p.startsWith('sale') ? 'sale'
    : p.startsWith('receipt') ? 'collection'
    : p.startsWith('settlement') ? 'bill'
    : p.startsWith('payment') ? 'payment'
    : 'adjustment';
  return {
    id: `${party.id}:${idx}:${row.voucher || 'opening'}`,
    partyId: party.id,
    type,
    amount,
    at: localDate(opening || row.date === '—' ? fallbackDate : row.date),
    note: opening ? 'Opening balance' : `${row.particulars}${row.voucher ? ` · ${row.voucher}` : ''}`,
    source,
    voucher: row.voucher || undefined,
    balanceAfter,
  };
}

/** One party + its ledger rows (newest first, with running balance) from the accounting ledgers. */
export function usePartyLedger(partyId: string | undefined) {
  const { parties, isLoading: lp } = useKhataParties();
  const party = parties.find((p) => p.id === partyId) ?? null;
  const isCustomer = party?.type === 'customer';

  const { data: cl, isLoading: lcl, isFetching: fcl } = useGetCustomerLedgerQuery(partyId as string, { skip: !party || !isCustomer });
  const { data: sl, isLoading: lsl, isFetching: fsl } = useGetSupplierLedgerQuery(partyId as string, { skip: !party || isCustomer });
  const ledger = isCustomer ? cl : sl;

  return useMemo(() => {
    if (!party || !ledger) return { party, rows: [] as LedgerRow[], balance: 0, isLoading: lp || lcl || lsl, isFetching: fcl || fsl };
    const firstDated = ledger.rows.find((r) => r.date !== '—')?.date ?? new Date().toISOString().slice(0, 10);
    const chrono = ledger.rows
      .filter((r) => r.particulars !== 'Opening balance' || r.balance !== 0)
      .map((r, i) => toEntry(r, party, i, firstDated));
    const rows = [...chrono].reverse();
    const balance = isCustomer ? ledger.balance : -ledger.balance;
    return { party, rows, balance, isLoading: false, isFetching: fcl || fsl };
  }, [party, ledger, isCustomer, lp, lcl, lsl, fcl, fsl]);
}

/** Receivable / payable across the whole book — the Dashboard tile. */
export function useKhataTotals() {
  const { data } = useGetOutstandingSummaryQuery();
  return { get: data?.receivable ?? 0, give: data?.payable ?? 0 };
}

export type { LedgerEntry };
