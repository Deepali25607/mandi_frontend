import { apiSlice } from './apiSlice';
import type {
  FeatureCatalogueItem,
  PlatformOrgDetail,
  PlatformOrgRow,
  PlatformSetting,
  PlatformStats,
  SubscriptionPlan,
  UpdateOrgSubscription,
} from '@/types/platform';
import type { PlatformBranding } from '@/types/appearance';

export const platformApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // --- Platform dashboard / stats ---
    getPlatformStats: build.query<PlatformStats, void>({
      query: () => '/platform/stats',
      providesTags: ['PlatformStats'],
    }),

    // --- Organizations (tenants) ---
    getPlatformOrgs: build.query<PlatformOrgRow[], void>({
      query: () => '/platform/organizations',
      providesTags: ['PlatformOrg'],
    }),
    getPlatformOrg: build.query<PlatformOrgDetail, string>({
      query: (id) => `/platform/organizations/${id}`,
      providesTags: ['PlatformOrg'],
    }),
    updatePlatformOrg: build.mutation<PlatformOrgDetail, { id: string; body: UpdateOrgSubscription }>({
      query: ({ id, body }) => ({ url: `/platform/organizations/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['PlatformOrg', 'PlatformStats'],
    }),

    // --- Plans ---
    getPlans: build.query<SubscriptionPlan[], void>({
      query: () => '/platform/plans',
      providesTags: ['Plan'],
    }),
    getFeatureCatalogue: build.query<FeatureCatalogueItem[], void>({
      query: () => '/platform/feature-catalogue',
    }),
    createPlan: build.mutation<SubscriptionPlan, Partial<SubscriptionPlan>>({
      query: (body) => ({ url: '/platform/plans', method: 'POST', body }),
      invalidatesTags: ['Plan', 'PlatformStats'],
    }),
    updatePlan: build.mutation<SubscriptionPlan, { id: string; body: Partial<SubscriptionPlan> }>({
      query: ({ id, body }) => ({ url: `/platform/plans/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Plan', 'PlatformOrg', 'PlatformStats'],
    }),

    // --- Settings ---
    getPlatformSettings: build.query<PlatformSetting[], void>({
      query: () => '/platform/settings',
      providesTags: ['PlatformSettings'],
    }),
    updatePlatformSetting: build.mutation<PlatformSetting, { key: string; value: string }>({
      query: ({ key, value }) => ({ url: `/platform/settings/${key}`, method: 'PATCH', body: { value } }),
      invalidatesTags: ['PlatformSettings'],
    }),

    // --- Login-screen branding (Super Admin) ---
    getBranding: build.query<PlatformBranding, void>({
      query: () => '/platform/branding',
      providesTags: ['Branding'],
    }),
    updateBranding: build.mutation<PlatformBranding, PlatformBranding>({
      query: (body) => ({ url: '/platform/branding', method: 'PATCH', body }),
      invalidatesTags: ['Branding'],
    }),

    // --- Public plans + branding (registration / login screens) ---
    getPublicPlans: build.query<SubscriptionPlan[], void>({
      query: () => '/plans/public',
    }),
    getPublicBranding: build.query<PlatformBranding, void>({
      query: () => '/branding/public',
      providesTags: ['Branding'],
    }),
  }),
});

export const {
  useGetPlatformStatsQuery,
  useGetPlatformOrgsQuery,
  useGetPlatformOrgQuery,
  useUpdatePlatformOrgMutation,
  useGetPlansQuery,
  useGetFeatureCatalogueQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useGetPlatformSettingsQuery,
  useUpdatePlatformSettingMutation,
  useGetBrandingQuery,
  useUpdateBrandingMutation,
  useGetPublicPlansQuery,
  useGetPublicBrandingQuery,
} = platformApi;
