export type ItemCategory = 'vegetables' | 'fruits' | 'flowers' | 'grocery';
export type CommissionType = 'percentage' | 'fixed_per_kg';
export type PaymentMode = 'cash' | 'credit' | 'upi' | 'bank';
export type LotStatus = 'active' | 'closed';

export interface Item {
  id: string;
  code: string;
  name: string;
  category: ItemCategory;
  unit: string;
  defaultCommissionPct: number;
  defaultMarketFeePct: number;
  isActive: boolean;
}

/** Newest selling price of an item (from the append-only price log). */
export interface LatestItemPrice {
  itemId: string;
  price: number;
  previousPrice: number | null;
  effectiveDate: string;
  updatedAt: string;
}

/** One row of the org-wide price-change log (report). */
export type ItemPriceLogRow = ItemPriceHistoryRow & { itemId: string };

/** One entry of an item's price-change audit trail. */
export interface ItemPriceHistoryRow {
  id: string;
  price: number;
  previousPrice: number | null;
  effectiveDate: string;
  notes?: string;
  updatedBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  village?: string;
  mobile?: string;
  commissionType: CommissionType;
  commissionRate: number;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  openingBalance: number;
  isActive: boolean;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  mobile?: string;
  area?: string;
  gstNumber?: string;
  creditLimit: number;
  openingBalance: number;
  isActive: boolean;
}

export interface StockLot {
  id: string;
  lotNumber: string;
  itemId: string;
  supplierId: string;
  arrivalId: string;
  rate: number;
  qtyArrived: number;
  weightArrived: number;
  qtyAvailable: number;
  weightAvailable: number;
  status: LotStatus;
  date: string;
}

export interface StockSummaryRow {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  lots: number;
  qtyAvailable: number;
  weightAvailable: number;
  stockValue: number;
}

export interface ArrivalLine {
  id: string;
  itemId: string;
  lotNumber: string;
  quantity: number;
  weight: number;
  rate: number;
  amount: number;
}

export interface Arrival {
  id: string;
  arrivalNumber: string;
  date: string;
  supplierId: string;
  vehicleNumber?: string;
  transportCharges: number;
  notes?: string;
  totalQuantity: number;
  totalWeight: number;
  totalValue: number;
  lines: ArrivalLine[];
  createdAt: string;
  /** Present on GET /arrivals/:id — true when items can't be edited (stock used). */
  linesLocked?: boolean;
  lockReason?: string | null;
}

export interface SaleLine {
  id: string;
  itemId: string;
  lotId: string | null;
  quantity: number;
  weight: number;
  rate: number;
  commissionPct: number;
  marketFeePct: number;
  grossAmount: number;
  commissionAmount: number;
  marketFeeAmount: number;
  netAmount: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  customerId: string;
  paymentMode: PaymentMode;
  notes?: string;
  grossAmount: number;
  commissionAmount: number;
  marketFeeAmount: number;
  netAmount: number;
  lines: SaleLine[];
  createdAt: string;
  /** Present on GET /sales/:id — true when items can't be edited (settled). */
  linesLocked?: boolean;
  lockReason?: string | null;
}

// ---- Create payloads ----
export interface CreateArrivalPayload {
  date: string;
  supplierId: string;
  vehicleNumber?: string;
  transportCharges?: number;
  notes?: string;
  lines: Array<{ itemId: string; quantity: number; weight: number; rate: number }>;
}

export interface CreateSalePayload {
  date: string;
  customerId: string;
  paymentMode?: PaymentMode;
  notes?: string;
  lines: Array<{
    itemId: string;
    lotId?: string;
    quantity: number;
    weight: number;
    rate: number;
    commissionPct?: number;
    marketFeePct?: number;
  }>;
}
