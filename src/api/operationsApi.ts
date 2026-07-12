import { apiSlice } from './apiSlice';
import type {
  Arrival,
  CreateArrivalPayload,
  CreateSalePayload,
  Sale,
  StockLot,
  StockSummaryRow,
} from '@/types/domain';
import type { Challan } from '@/types/finance';

export const operationsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // ---- Inventory ----
    getStockLots: build.query<StockLot[], { itemId?: string; availableOnly?: boolean } | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.itemId) params.set('itemId', args.itemId);
        if (args?.availableOnly) params.set('available', 'true');
        const qs = params.toString();
        return `/inventory/lots${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Inventory'],
    }),
    getStockSummary: build.query<StockSummaryRow[], void>({
      query: () => '/inventory/summary',
      providesTags: ['Inventory'],
    }),

    // ---- Arrivals ----
    getArrivals: build.query<Arrival[], void>({
      query: () => '/arrivals',
      providesTags: ['Arrival'],
    }),
    getArrival: build.query<Arrival, string>({
      query: (id) => `/arrivals/${id}`,
      providesTags: ['Arrival'],
    }),
    createArrival: build.mutation<Arrival, CreateArrivalPayload>({
      query: (body) => ({ url: '/arrivals', method: 'POST', body }),
      invalidatesTags: ['Arrival', 'Inventory', 'Dashboard'],
    }),
    updateArrival: build.mutation<Arrival, { id: string; body: Partial<CreateArrivalPayload> }>({
      query: ({ id, body }) => ({ url: `/arrivals/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Arrival', 'Inventory', 'Dashboard', 'Outstanding'],
    }),

    // ---- Sales ----
    getSales: build.query<Sale[], void>({
      query: () => '/sales',
      providesTags: ['Sale'],
    }),
    getSale: build.query<Sale, string>({
      query: (id) => `/sales/${id}`,
      providesTags: ['Sale'],
    }),
    createSale: build.mutation<Sale, CreateSalePayload>({
      query: (body) => ({ url: '/sales', method: 'POST', body }),
      invalidatesTags: ['Sale', 'Inventory', 'Dashboard'],
    }),
    updateSale: build.mutation<Sale, { id: string; body: Partial<CreateSalePayload> }>({
      query: ({ id, body }) => ({ url: `/sales/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Sale', 'Inventory', 'Dashboard', 'Outstanding', 'SupplierBill'],
    }),

    // ---- For-Sale Challans ----
    getChallans: build.query<Challan[], void>({
      query: () => '/challans',
      providesTags: ['Challan'],
    }),
    createChallan: build.mutation<Challan, {
      date: string; agentName: string; vehicleNumber?: string; notes?: string;
      lines: Array<{ itemId: string; lotId?: string; quantity: number; weight: number; rate: number }>;
    }>({
      query: (body) => ({ url: '/challans', method: 'POST', body }),
      invalidatesTags: ['Challan', 'Inventory'],
    }),
    reportChallan: build.mutation<Challan, { id: string; reportedSaleAmount: number; agentCommission?: number; otherCharges?: number }>({
      query: ({ id, ...body }) => ({ url: `/challans/${id}/report`, method: 'POST', body }),
      invalidatesTags: ['Challan'],
    }),
    settleChallan: build.mutation<Challan, { id: string; settledDate: string; settledAmount: number }>({
      query: ({ id, ...body }) => ({ url: `/challans/${id}/settle`, method: 'POST', body }),
      invalidatesTags: ['Challan'],
    }),
  }),
});

export const {
  useGetStockLotsQuery,
  useGetStockSummaryQuery,
  useGetArrivalsQuery,
  useGetArrivalQuery,
  useLazyGetArrivalQuery,
  useCreateArrivalMutation,
  useUpdateArrivalMutation,
  useGetSalesQuery,
  useGetSaleQuery,
  useLazyGetSaleQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useGetChallansQuery,
  useCreateChallanMutation,
  useReportChallanMutation,
  useSettleChallanMutation,
} = operationsApi;
