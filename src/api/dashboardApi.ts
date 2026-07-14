import { apiSlice } from './apiSlice';
import type { CashInHandBreakdown, DashboardData, SalesModeResult } from '@/types';

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
    getSalesByMode: build.query<SalesModeResult, { mode: 'cash' | 'credit'; from: string; to: string }>({
      query: ({ mode, from, to }) => `/dashboard/sales-by-mode?mode=${mode}&from=${from}&to=${to}`,
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardOverviewQuery, useGetCashInHandQuery, useGetSalesByModeQuery } = dashboardApi;
