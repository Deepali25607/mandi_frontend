import { apiSlice } from './apiSlice';
import type { AppearanceConfig } from '@/types/appearance';

/** Theme & Wallpaper — per-organization, readable by all org users, writable by the Org Admin. */
export const appearanceApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getAppearance: build.query<AppearanceConfig, void>({
      query: () => '/organization/appearance',
      providesTags: ['Appearance'],
    }),
    updateAppearance: build.mutation<AppearanceConfig, AppearanceConfig>({
      query: (body) => ({ url: '/organization/appearance', method: 'PATCH', body }),
      invalidatesTags: ['Appearance'],
    }),
  }),
});

export const { useGetAppearanceQuery, useUpdateAppearanceMutation } = appearanceApi;
