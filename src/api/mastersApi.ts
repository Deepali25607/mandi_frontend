import { apiSlice } from './apiSlice';
import type { Customer, Item, Supplier } from '@/types/domain';

type ItemBody = Partial<Item>;
type SupplierBody = Partial<Supplier>;
type CustomerBody = Partial<Customer>;

export const mastersApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // ---- Items ----
    getItems: build.query<Item[], string | void>({
      query: (search) => (search ? `/items?search=${encodeURIComponent(search)}` : '/items'),
      providesTags: ['Item'],
    }),
    createItem: build.mutation<Item, ItemBody>({
      query: (body) => ({ url: '/items', method: 'POST', body }),
      invalidatesTags: ['Item'],
    }),
    updateItem: build.mutation<Item, { id: string; body: ItemBody }>({
      query: ({ id, body }) => ({ url: `/items/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Item'],
    }),
    deleteItem: build.mutation<Item, string>({
      query: (id) => ({ url: `/items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Item'],
    }),

    // ---- Suppliers ----
    getSuppliers: build.query<Supplier[], string | void>({
      query: (search) => (search ? `/suppliers?search=${encodeURIComponent(search)}` : '/suppliers'),
      providesTags: ['Supplier'],
    }),
    createSupplier: build.mutation<Supplier, SupplierBody>({
      query: (body) => ({ url: '/suppliers', method: 'POST', body }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: build.mutation<Supplier, { id: string; body: SupplierBody }>({
      query: ({ id, body }) => ({ url: `/suppliers/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Supplier'],
    }),
    deleteSupplier: build.mutation<Supplier, string>({
      query: (id) => ({ url: `/suppliers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Supplier'],
    }),

    // ---- Customers ----
    getCustomers: build.query<Customer[], string | void>({
      query: (search) => (search ? `/customers?search=${encodeURIComponent(search)}` : '/customers'),
      providesTags: ['Customer'],
    }),
    createCustomer: build.mutation<Customer, CustomerBody>({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['Customer'],
    }),
    updateCustomer: build.mutation<Customer, { id: string; body: CustomerBody }>({
      query: ({ id, body }) => ({ url: `/customers/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Customer'],
    }),
    deleteCustomer: build.mutation<Customer, string>({
      query: (id) => ({ url: `/customers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Customer'],
    }),
  }),
});

export const {
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = mastersApi;
