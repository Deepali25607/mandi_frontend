import { apiSlice } from './apiSlice';
import type { AuthUser, LoginResponse } from '@/types';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, { username: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    registerOrganization: build.mutation<LoginResponse, {
      organizationName: string; adminName: string; username: string; password: string; mobile?: string; email?: string; planId?: string;
    }>({
      query: (body) => ({ url: '/auth/register-organization', method: 'POST', body }),
    }),
    changePassword: build.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
    setSecurityQuestion: build.mutation<{ message: string }, { question: string; answer: string }>({
      query: (body) => ({ url: '/auth/security-question', method: 'POST', body }),
    }),
    getRecoveryQuestion: build.query<{ username: string; question: string }, string>({
      query: (username) => `/auth/recovery-question?username=${encodeURIComponent(username)}`,
    }),
    recover: build.mutation<{ message: string }, { username: string; answer: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/recover', method: 'POST', body }),
    }),
    getMe: build.query<AuthUser, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterOrganizationMutation,
  useChangePasswordMutation,
  useSetSecurityQuestionMutation,
  useLazyGetRecoveryQuestionQuery,
  useRecoverMutation,
  useGetMeQuery,
} = authApi;
