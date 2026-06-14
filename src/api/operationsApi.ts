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
    createArrival: build.mutation<Arrival, CreateArrivalPayload>({
      query: (body) => ({ url: '/arrivals', method: 'POST', body }),
      invalidatesTags: ['Arrival', 'Inventory', 'Dashboard'],
    }),

    // ---- Sales ----
    getSales: build.query<Sale[], void>({
      query: () => '/sales',
      providesTags: ['Sale'],
    }),
    createSale: build.mutation<Sale, CreateSalePayload>({
      query: (body) => ({ url: '/sales', method: 'POST', body }),
      invalidatesTags: ['Sale', 'Inventory', 'Dashboard'],
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
  useCreateArrivalMutation,
  useGetSalesQuery,
  useCreateSaleMutation,
  useGetChallansQuery,
  useCreateChallanMutation,
  useReportChallanMutation,
  useSettleChallanMutation,
} = operationsApi;
