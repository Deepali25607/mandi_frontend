import { apiSlice } from './apiSlice';
import type { DashboardData } from '@/types';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getDashboardOverview: build.query<DashboardData, void>({
      query: () => '/dashboard/overview',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardOverviewQuery } = dashboardApi;
