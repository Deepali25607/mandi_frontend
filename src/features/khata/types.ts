/**
 * Khata (party ledger) domain types — a Khatabook-style *view* over the ERP's
 * real customers, suppliers, sales, collections, supplier bills and payments.
 *
 * Balance convention (from the business owner's perspective):
 *   balance > 0 → "You will get"  (party owes us)     — shown in red
 *   balance < 0 → "You will give" (we owe the party)  — shown in green
 */
export type PartyType = 'customer' | 'supplier';

/** 'gave' = we gave goods/money; 'got' = we received money/goods. */
export type EntryType = 'gave' | 'got';

export interface Party {
  id: string;
  code: string;
  name: string;
  phone?: string;
  type: PartyType;
  /** ISO date (yyyy-mm-dd) for the collection reminder — stored locally per device. */
  reminderDate?: string;
}

/** What ERP document a ledger line comes from. */
export type EntrySource = 'opening' | 'sale' | 'collection' | 'bill' | 'payment' | 'adjustment';

export interface LedgerEntry {
  id: string;
  partyId: string;
  type: EntryType;
  amount: number;
  /** ISO date of the transaction. */
  at: string;
  note?: string;
  source: EntrySource;
  /** Voucher number of the underlying document (sale/collection/bill/payment). */
  voucher?: string;
}

/** A ledger entry decorated with its running balance (after applying it). */
export interface LedgerRow extends LedgerEntry {
  balanceAfter: number;
}
