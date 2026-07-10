import { apiSlice } from './apiSlice';
import type {
  MySubscription,
  PlatformPaymentRow,
  RequestPaymentBody,
  SubscriptionPayment,
  SubscriptionPaymentStatus,
} from '@/types/subscription';

export const subscriptionApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // --- Tenant (org admin) ---
    getMySubscription: build.query<MySubscription, void>({
      query: () => '/subscription/me',
      providesTags: ['Subscription'],
    }),
    requestSubscriptionPayment: build.mutation<SubscriptionPayment, RequestPaymentBody>({
      query: (body) => ({ url: '/subscription/payments', method: 'POST', body }),
      invalidatesTags: ['Subscription', 'SubscriptionPayment'],
    }),

    // --- Platform (super admin) ---
    getPlatformPayments: build.query<PlatformPaymentRow[], SubscriptionPaymentStatus | void>({
      query: (status) => (status ? `/platform/payments?status=${status}` : '/platform/payments'),
      providesTags: ['SubscriptionPayment'],
    }),
    approvePlatformPayment: build.mutation<SubscriptionPayment, string>({
      query: (id) => ({ url: `/platform/payments/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['SubscriptionPayment', 'PlatformOrg', 'PlatformStats', 'Subscription'],
    }),
    rejectPlatformPayment: build.mutation<SubscriptionPayment, { id: string; reviewNote?: string }>({
      query: ({ id, reviewNote }) => ({
        url: `/platform/payments/${id}/reject`,
        method: 'POST',
        body: { reviewNote },
      }),
      invalidatesTags: ['SubscriptionPayment', 'Subscription'],
    }),
  }),
});

export const {
  useGetMySubscriptionQuery,
  useRequestSubscriptionPaymentMutation,
  useGetPlatformPaymentsQuery,
  useApprovePlatformPaymentMutation,
  useRejectPlatformPaymentMutation,
} = subscriptionApi;
