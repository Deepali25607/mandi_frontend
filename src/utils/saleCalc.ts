/**
 * Single source of truth for sale-line arithmetic on the client. Mirrors
 * `sales.service.ts` on the API exactly (same base rule, same 2-dp rounding) so
 * the Sale Entry preview, the saved sale, the invoice and the reports agree.
 *
 * Chain:  Qty → Weight → ₹/kg (normalized rate) → gross → commission / fee → net
 */

/** How the user typed the rate: per kg, or per standard unit (e.g. a 40 kg bag). */
export type RateBasis = 'kg' | 'unit';

/** Mandi convention when an item has no standard unit weight configured. */
export const DEFAULT_UNIT_WEIGHT_KG = 40;

/** Fixed adhat defaults: every sale line pops up with 7% commission and 0% market fee (editable per line). */
export const DEFAULT_COMMISSION_PCT = 7;
export const DEFAULT_MARKET_FEE_PCT = 0;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Parse a form value; anything non-finite (blank, "-", "e") counts as 0. */
export function toNumber(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Standard unit weight of an item, falling back to the mandi default. */
export function unitWeightOf(item?: { standardUnitWeightKg?: number | null } | null): number {
  const w = toNumber(item?.standardUnitWeightKg);
  return w > 0 ? w : DEFAULT_UNIT_WEIGHT_KG;
}

/** Weight implied by Qty × standard unit weight; null when it can't be derived. */
export function autoWeight(quantity: number, unitWeightKg: number): number | null {
  if (!(quantity > 0) || !(unitWeightKg > 0)) return null;
  return round2(quantity * unitWeightKg);
}

/** Convert a typed rate in `basis` to the normalized ₹/kg that gets stored. */
export function normalizeRate(input: number, basis: RateBasis, unitWeightKg: number): number {
  if (!(input >= 0)) return 0;
  if (basis === 'kg') return round2(input);
  return unitWeightKg > 0 ? round2(input / unitWeightKg) : 0;
}

/** Express a normalized ₹/kg rate in the given basis (for display / the input box). */
export function rateInBasis(ratePerKg: number, basis: RateBasis, unitWeightKg: number): number {
  if (!(ratePerKg >= 0)) return 0;
  return basis === 'kg' ? round2(ratePerKg) : round2(ratePerKg * unitWeightKg);
}

/** Number → input-box string without float noise ("50", "52.5", "" for 0). */
export function toInput(n: number): string {
  return n > 0 ? String(round2(n)) : '';
}

/** Rate applies to weight when present, else to quantity (per-unit sale) — API rule. */
export function saleBase(quantity: number, weight: number): number {
  return weight > 0 ? weight : quantity > 0 ? quantity : 0;
}

export interface SaleLineInput {
  quantity: number;
  weight: number;
  /** Normalized ₹/kg (or per unit when no weight). */
  rate: number;
  /** Dual rate (Commission lots): what the supplier settles at. */
  supplierRate?: number;
  commissionPct: number;
  marketFeePct: number;
}

export interface SaleLineResult {
  base: number;
  gross: number;
  settleBase: number;
  commission: number;
  marketFee: number;
  net: number;
  margin: number;
}

/**
 * Same formula as the API's line builder:
 *   gross      = base × rate
 *   settleBase = base × supplierRate (dual rate) | gross
 *   commission = settleBase × commission%   fee = settleBase × fee%
 *   net        = settleBase − commission − fee   margin = gross − settleBase
 */
export function computeSaleLine(l: SaleLineInput): SaleLineResult {
  const base = saleBase(toNumber(l.quantity), toNumber(l.weight));
  const gross = round2(base * toNumber(l.rate));
  const supplierRate = toNumber(l.supplierRate);
  const settleBase = supplierRate > 0 ? round2(base * supplierRate) : gross;
  const commission = round2((settleBase * toNumber(l.commissionPct)) / 100);
  const marketFee = round2((settleBase * toNumber(l.marketFeePct)) / 100);
  const net = round2(settleBase - commission - marketFee);
  const margin = round2(gross - settleBase);
  return { base, gross, settleBase, commission, marketFee, net, margin };
}
