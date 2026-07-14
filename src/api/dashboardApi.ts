import { apiSlice } from './apiSlice';
import type { CashInHandBreakdown, DashboardData } from '@/types';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getDashboardOverview: build.query<DashboardData, void>({
      query: () => '/dashboard/overview',
      providesTags: ['Dashboard'],
    }),
    getCashInHand: build.query<CashInHandBreakdown, string | void>({
      query: (date) => (date ? `/dashboard/cash-in-hand?date=${date}` : '/dashboard/cash-in-hand'),
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardOverviewQuery, useGetCashInHandQuery } = dashboardApi;
