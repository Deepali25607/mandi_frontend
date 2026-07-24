import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store/store';
import { logout } from '@/store/authSlice';
import { API_BASE } from '@/utils/apiBase';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/** Wraps the base query so a 401 anywhere logs the user out cleanly. */
const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Auth',
    'Dashboard',
    'Item',
    'ItemPrice',
    'Supplier',
    'Customer',
    'Inventory',
    'Arrival',
    'Sale',
    'Collection',
    'BankAccount',
    'CashTransfer',
    'PrinterProfile',
    'SupplierBill',
    'SupplierPayment',
    'Expense',
    'Outstanding',
    'Crate',
    'Organization',
    'Branch',
    'User',
    'CustomRole',
    'Adjustment',
    'Challan',
    'Plan',
    'PlatformOrg',
    'PlatformStats',
    'PlatformSettings',
    'Appearance',
    'Branding',
    'Subscription',
    'SubscriptionPayment',
  ],
  endpoints: () => ({}),
});
