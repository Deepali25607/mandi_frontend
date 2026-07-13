import { apiSlice } from './apiSlice';
import type { Branch, ManagedUser, Organization } from '@/types/finance';
import type { AssignableScreen, CustomRole } from '@/types';

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getOrganization: build.query<Organization, void>({
      query: () => '/organization',
      providesTags: ['Organization'],
    }),
    updateOrganization: build.mutation<Organization, Partial<Organization>>({
      query: (body) => ({ url: '/organization', method: 'PATCH', body }),
      invalidatesTags: ['Organization'],
    }),

    getBranches: build.query<Branch[], void>({
      query: () => '/branches',
      providesTags: ['Branch'],
    }),
    createBranch: build.mutation<Branch, Partial<Branch>>({
      query: (body) => ({ url: '/branches', method: 'POST', body }),
      invalidatesTags: ['Branch'],
    }),
    updateBranch: build.mutation<Branch, { id: string; body: Partial<Branch> }>({
      query: ({ id, body }) => ({ url: `/branches/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Branch'],
    }),

    getUsers: build.query<ManagedUser[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: build.mutation<ManagedUser, { name: string; username: string; password: string; role?: string; customRoleId?: string | null; branchId?: string; mobile?: string }>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: build.mutation<ManagedUser, { id: string; body: Partial<ManagedUser> }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    resetUserPassword: build.mutation<{ message: string }, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({ url: `/users/${id}/reset-password`, method: 'POST', body: { newPassword } }),
    }),

    // ---- Custom (organization-defined) roles ----
    getAssignableScreens: build.query<AssignableScreen[], void>({
      query: () => '/custom-roles/screens',
    }),
    getCustomRoles: build.query<CustomRole[], void>({
      query: () => '/custom-roles',
      providesTags: ['CustomRole'],
    }),
    createCustomRole: build.mutation<CustomRole, { name: string; description?: string; screens: string[] }>({
      query: (body) => ({ url: '/custom-roles', method: 'POST', body }),
      invalidatesTags: ['CustomRole'],
    }),
    updateCustomRole: build.mutation<CustomRole, { id: string; body: Partial<{ name: string; description: string; screens: string[]; isActive: boolean }> }>({
      query: ({ id, body }) => ({ url: `/custom-roles/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['CustomRole', 'User'],
    }),
    deleteCustomRole: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: `/custom-roles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CustomRole'],
    }),
  }),
});

export const {
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetUserPasswordMutation,
  useGetAssignableScreensQuery,
  useGetCustomRolesQuery,
  useCreateCustomRoleMutation,
  useUpdateCustomRoleMutation,
  useDeleteCustomRoleMutation,
} = adminApi;
