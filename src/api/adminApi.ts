import { apiSlice } from './apiSlice';
import type { Branch, ManagedUser, Organization } from '@/types/finance';

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
    createUser: build.mutation<ManagedUser, { name: string; username: string; password: string; role: string; branchId?: string; mobile?: string }>({
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
} = adminApi;
