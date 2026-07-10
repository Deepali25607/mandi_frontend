// Mirrors the backend role enum (Role) and API contracts.

export type Role =
  | 'super_admin'
  | 'org_admin'
  | 'accountant'
  | 'sales_operator'
  | 'inventory_manager'
  | 'collection_executive'
  | 'purchase_operator'
  | 'auditor';

/** Subscription feature keys (mirrors backend PlatformFeature). */
export type PlatformFeature =
  | 'settlements'
  | 'expenses'
  | 'accounting'
  | 'crates'
  | 'challans'
  | 'adjustments'
  | 'reports';

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';

export interface SubscriptionSummary {
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus | null;
  renewalDate: string | null;
  /** True when the trial/subscription has lapsed (app is read-only). */
  locked?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  mobile?: string;
  role: Role;
  roleLabel: string;
  organizationId: string | null;
  branchId: string | null;
  mustChangePassword: boolean;
  /** Feature keys enabled by the org's plan (empty for Super Admin). */
  features?: PlatformFeature[];
  subscription?: SubscriptionSummary;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface KpiCard {
  key: string;
  label: string;
  value: number;
  format: 'currency' | 'count';
  deltaPct?: number;
  icon: string;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  asOf: string;
  isDemoData: boolean;
  kpis: KpiCard[];
  charts: {
    dailySalesTrend: SeriesPoint[];
    collectionTrend: SeriesPoint[];
    outstandingAnalysis: SeriesPoint[];
    itemWiseSales: SeriesPoint[];
    customerWiseSales: SeriesPoint[];
    supplierWiseSales: SeriesPoint[];
  };
}
