import type { Sale } from '@/types/domain';

/**
 * Derived, read-only figures for a sale bill — used by the All Sales listing,
 * the summary cards and the invoice/view dialog so they always agree.
 *
 * Payment note: the ERP tracks a customer's outstanding at the ledger level
 * (collections against the customer, not against a single bill), so there is no
 * per-bill payment record. Paid / balance / status here are derived from the
 * sale's payment mode: an immediate sale (cash/upi/bank) is treated as fully
 * paid, a credit sale as unpaid (its balance rolls into Outstanding). This never
 * touches the stored sale — it is a view-only convenience.
 */
export type PaymentStatus = 'paid' | 'unpaid';

export interface SaleBill {
  totalQty: number;
  totalWeight: number;
  /** Goods amount (sum of line gross) before other charges. */
  subtotal: number;
  otherCharges: number;
  commission: number;
  marketFee: number;
  /** What the customer owes: goods + other charges. */
  grandTotal: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  /** True for an immediate (non-credit) sale. */
  isCash: boolean;
}

export function saleBill(sale: Sale): SaleBill {
  const totalQty = round2((sale.lines ?? []).reduce((s, l) => s + (l.quantity || 0), 0));
  const totalWeight = round2((sale.lines ?? []).reduce((s, l) => s + (l.weight || 0), 0));
  const otherCharges = sale.otherCharges ?? 0;
  const grandTotal = round2(sale.grossAmount + otherCharges);
  const isCash = sale.paymentMode !== 'credit';
  const paid = isCash ? grandTotal : 0;
  return {
    totalQty,
    totalWeight,
    subtotal: sale.grossAmount,
    otherCharges,
    commission: sale.commissionAmount,
    marketFee: sale.marketFeeAmount,
    grandTotal,
    paid,
    balance: round2(grandTotal - paid),
    status: isCash ? 'paid' : 'unpaid',
    isCash,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
