import type { PaymentMode } from './domain';

export interface Collection {
  id: string;
  collectionNumber: string;
  date: string;
  customerId: string;
  amount: number;
  paymentMode: PaymentMode;
  reference?: string;
  notes?: string;
}

export interface SupplierBill {
  id: string;
  billNumber: string;
  date: string;
  supplierId: string;
  fromDate: string;
  toDate: string;
  grossSales: number;
  commissionAmount: number;
  marketFeeAmount: number;
  labourCharges: number;
  crateCharges: number;
  otherCharges: number;
  netPayable: number;
  status: 'finalised' | 'paid';
  notes?: string;
}

export interface SupplierBillPreview {
  gross: number;
  commission: number;
  marketFee: number;
  net: number;
  saleLineCount: number;
}

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  date: string;
  supplierId: string;
  amount: number;
  paymentMode: PaymentMode;
  billId: string | null;
  reference?: string;
  notes?: string;
}

export type ExpenseCategory = 'labour' | 'transport' | 'electricity' | 'rent' | 'miscellaneous';

export interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
}

export interface CustomerOutstandingRow {
  customerId: string;
  code: string;
  name: string;
  area?: string;
  opening: number;
  sales: number;
  collected: number;
  balance: number;
}

export interface SupplierOutstandingRow {
  supplierId: string;
  code: string;
  name: string;
  village?: string;
  opening: number;
  billed: number;
  paid: number;
  balance: number;
  salesNet: number;
  unbilled: number;
}

export interface OutstandingSummary {
  receivable: number;
  payable: number;
}

export interface AgingBucket {
  label: string;
  value: number;
}

export interface LedgerRow {
  date: string;
  voucher: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerResult {
  name: string;
  rows: LedgerRow[];
  balance: number;
}

export interface CashBookRow {
  date: string;
  voucher: string;
  particulars: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface CashBookResult {
  rows: CashBookRow[];
  balance: number;
}

export interface TrialBalanceRow {
  account: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export type CrateParty = 'customer' | 'supplier';
export type CrateDirection = 'out' | 'in';

export interface CrateTransaction {
  id: string;
  date: string;
  partyType: CrateParty;
  partyId: string;
  direction: CrateDirection;
  quantity: number;
  damaged: number;
  notes?: string;
}

export interface CrateBalanceRow {
  partyType: CrateParty;
  partyId: string;
  name: string;
  out: number;
  in: number;
  damaged: number;
  balance: number;
}

// ---- Rate & Weight Adjustment (Module 5) ----
export type AdjustmentType = 'rate_increase' | 'rate_decrease' | 'weight_increase' | 'weight_decrease';

export interface Adjustment {
  id: string;
  adjustmentNumber: string;
  date: string;
  supplierId: string;
  itemId: string | null;
  type: AdjustmentType;
  actualValue: number;
  reportedValue: number;
  amount: number;
  notes?: string;
}

// ---- For-Sale Challan (Module 9) ----
export type ChallanStatus = 'transferred' | 'reported' | 'settled';

export interface ChallanLine {
  id: string;
  itemId: string;
  lotId: string | null;
  quantity: number;
  weight: number;
  rate: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  date: string;
  agentName: string;
  vehicleNumber?: string;
  status: ChallanStatus;
  totalQuantity: number;
  totalWeight: number;
  costValue: number;
  reportedSaleAmount: number;
  agentCommission: number;
  otherCharges: number;
  netReceivable: number;
  settledAmount: number;
  settledDate: string | null;
  notes?: string;
  lines: ChallanLine[];
}

// ---- Admin ----
export interface Organization {
  id: string;
  name: string;
  gstNumber?: string;
  address?: string;
  mobile?: string;
  email?: string;
}

export interface Branch {
  id: string;
  name: string;
  location?: string;
  contactDetails?: string;
  isActive: boolean;
}

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  mobile?: string;
  role: string;
  organizationId: string | null;
  branchId: string | null;
  isActive: boolean;
}
