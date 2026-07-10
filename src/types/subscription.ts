import type { SubscriptionStatus } from './index';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionPaymentStatus = 'pending' | 'approved' | 'rejected';

export type SubscriptionPaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'cheque' | 'other';

export interface SubscriptionPayment {
  id: string;
  organizationId: string;
  planId: string | null;
  amount: number;
  billingCycle: BillingCycle;
  method: SubscriptionPaymentMethod;
  reference?: string | null;
  note?: string | null;
  status: SubscriptionPaymentStatus;
  reviewNote?: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** Tenant-facing subscription state + how to pay (GET /subscription/me). */
export interface MySubscription {
  organizationId: string;
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus | null;
  locked: boolean;
  renewalDate: string | null;
  daysLeft: number | null;
  billingCycle: BillingCycle;
  priceMonthly: number;
  priceYearly: number;
  amountDue: number;
  paymentInstructions: string | null;
  paymentUpi: string | null;
  paymentBank: string | null;
  supportEmail: string | null;
  supportMobile: string | null;
  payments: SubscriptionPayment[];
}

export interface RequestPaymentBody {
  amount: number;
  billingCycle: BillingCycle;
  method: SubscriptionPaymentMethod;
  reference?: string;
  note?: string;
  planId?: string;
}

/** Platform review row (GET /platform/payments) — payment + org context. */
export interface PlatformPaymentRow extends SubscriptionPayment {
  organizationName: string | null;
  organizationStatus: SubscriptionStatus | null;
  organizationRenewalDate: string | null;
}
