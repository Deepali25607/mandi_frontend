import type { PlatformFeature, SubscriptionStatus } from './index';

export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number | null;
  maxBranches: number | null;
  features: PlatformFeature[];
  isDefault: boolean;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface FeatureCatalogueItem {
  key: PlatformFeature;
  label: string;
  description: string;
}

/** Row in the platform organizations list. */
export interface PlatformOrgRow {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  gstNumber?: string;
  isActive: boolean;
  planId: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  renewalDate: string | null;
  createdAt: string;
  userCount: number;
  branchCount: number;
}

export interface OrgUsage {
  users: number;
  branches: number;
  items: number;
  suppliers: number;
  customers: number;
  sales: number;
  arrivals: number;
  collections: number;
}

export interface PlatformOrgDetail {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  gstNumber?: string;
  address?: string;
  isActive: boolean;
  planId: string | null;
  plan: SubscriptionPlan | null;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  subscriptionStart: string | null;
  renewalDate: string | null;
  /** AI assistant override: true = force on, false = force off, null = follow plan. */
  aiAssistant: boolean | null;
  createdAt: string;
  primaryAdmin: { name: string; username: string; mobile?: string } | null;
  usage: OrgUsage;
}

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  estimatedMrr: number;
  byStatus: Record<string, number>;
  byPlan: { planId: string | null; planName: string; count: number }[];
  recentOrganizations: { id: string; name: string; planName: string | null; status: SubscriptionStatus; createdAt: string }[];
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string | null;
  label?: string;
}

export interface UpdateOrgSubscription {
  isActive?: boolean;
  planId?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  billingCycle?: BillingCycle;
  renewalDate?: string | null;
  aiAssistant?: boolean | null;
}
