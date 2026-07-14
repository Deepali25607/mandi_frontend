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
  /** Granted screen paths — present only when the user is on a custom role. */
  grantedScreens?: string[];
  /** The custom role's name, if the user is on a custom role. */
  customRoleName?: string | null;
  organizationId: string | null;
  /** Display name of the user's organization (null for platform Super Admin). */
  organizationName?: string | null;
  branchId: string | null;
  mustChangePassword: boolean;
  /** Feature keys enabled by the org's plan (empty for Super Admin). */
  features?: PlatformFeature[];
  subscription?: SubscriptionSummary;
}

/** A screen an Org Admin can grant to a custom role (from GET /custom-roles/screens). */
export interface AssignableScreen {
  path: string;
  label: string;
  section: 'Operations' | 'Masters' | 'Accounts' | 'Reports';
  feature: PlatformFeature | null;
  /** Always granted; shown as a locked/checked row in the editor. */
  always: boolean;
}

/** An organization-defined custom role. */
export interface CustomRole {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  screens: string[];
  isActive: boolean;
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
