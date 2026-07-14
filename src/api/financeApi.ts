import { apiSlice } from './apiSlice';
import type { PaymentMode } from '@/types/domain';
import type {
  Adjustment,
  AdjustmentType,
  AgingBucket,
  BankAccount,
  BankBalancesResult,
  CashBookResult,
  CashTransfer,
  Collection,
  CrateBalanceRow,
  CrateTransaction,
  CustomerOutstandingRow,
  Expense,
  ExpenseCategory,
  LedgerResult,
  OutstandingSummary,
  SupplierBill,
  SupplierBillPreview,
  SupplierOutstandingRow,
  SupplierPayment,
  TrialBalanceResult,
} from '@/types/finance';

export const financeApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // ---- Collections ----
    getCollections: build.query<Collection[], void>({
      query: () => '/collections',
      providesTags: ['Collection'],
    }),
    createCollection: build.mutation<Collection, {
      date: string; customerId: string; amount: number; paymentMode?: PaymentMode;
      bankAccountId?: string | null; charges?: number; reference?: string; notes?: string;
    }>({
      query: (body) => ({ url: '/collections', method: 'POST', body }),
      invalidatesTags: ['Collection', 'Outstanding', 'Dashboard'],
    }),

    // ---- Bank accounts ----
    getBankAccounts: build.query<BankAccount[], void>({
      query: () => '/bank-accounts',
      providesTags: ['BankAccount'],
    }),
    createBankAccount: build.mutation<BankAccount, { name: string; bankName?: string; accountNumber?: string; openingBalance?: number }>({
      query: (body) => ({ url: '/bank-accounts', method: 'POST', body }),
      invalidatesTags: ['BankAccount'],
    }),
    updateBankAccount: build.mutation<BankAccount, { id: string; body: Partial<{ name: string; bankName: string; accountNumber: string; openingBalance: number; isActive: boolean }> }>({
      query: ({ id, body }) => ({ url: `/bank-accounts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['BankAccount'],
    }),
    deleteBankAccount: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: `/bank-accounts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['BankAccount'],
    }),
    getBankBalances: build.query<BankBalancesResult, void>({
      query: () => '/accounting/bank-balances',
      providesTags: ['BankAccount', 'Collection', 'CashTransfer'],
    }),

    // ---- Cash ↔ Bank transfers ----
    getCashTransfers: build.query<CashTransfer[], void>({
      query: () => '/cash-transfers',
      providesTags: ['CashTransfer'],
    }),
    createCashTransfer: build.mutation<CashTransfer, { date: string; direction: 'cash_to_bank' | 'bank_to_cash'; bankAccountId: string; amount: number; notes?: string }>({
      query: (body) => ({ url: '/cash-transfers', method: 'POST', body }),
      invalidatesTags: ['CashTransfer', 'BankAccount'],
    }),

    // ---- Expenses ----
    getExpenses: build.query<Expense[], void>({
      query: () => '/expenses',
      providesTags: ['Expense'],
    }),
    getExpenseCategories: build.query<string[], void>({
      query: () => '/expenses/categories',
      providesTags: ['Expense'],
    }),
    createExpense: build.mutation<Expense, {
      date: string; category: ExpenseCategory; amount: number; paymentMode?: PaymentMode; notes?: string;
    }>({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      invalidatesTags: ['Expense'],
    }),

    // ---- Settlements ----
    getSupplierBills: build.query<SupplierBill[], void>({
      query: () => '/settlements/bills',
      providesTags: ['SupplierBill'],
    }),
    previewSupplierBill: build.mutation<SupplierBillPreview, { supplierId: string; fromDate: string; toDate: string }>({
      query: (body) => ({ url: '/settlements/bills/preview', method: 'POST', body }),
    }),
    createSupplierBill: build.mutation<SupplierBill, {
      supplierId: string; fromDate: string; toDate: string; date: string;
      labourCharges?: number; crateCharges?: number; otherCharges?: number; notes?: string;
    }>({
      query: (body) => ({ url: '/settlements/bills', method: 'POST', body }),
      invalidatesTags: ['SupplierBill', 'Outstanding', 'Dashboard'],
    }),
    getSupplierPayments: build.query<SupplierPayment[], void>({
      query: () => '/settlements/payments',
      providesTags: ['SupplierPayment'],
    }),
    createSupplierPayment: build.mutation<SupplierPayment, {
      supplierId: string; date: string; amount: number; paymentMode?: PaymentMode; billId?: string; reference?: string; notes?: string;
    }>({
      query: (body) => ({ url: '/settlements/payments', method: 'POST', body }),
      invalidatesTags: ['SupplierPayment', 'SupplierBill', 'Outstanding', 'Dashboard'],
    }),

    // ---- Outstanding ----
    getCustomerOutstanding: build.query<CustomerOutstandingRow[], void>({
      query: () => '/outstanding/customers',
      providesTags: ['Outstanding'],
    }),
    getSupplierOutstanding: build.query<SupplierOutstandingRow[], void>({
      query: () => '/outstanding/suppliers',
      providesTags: ['Outstanding'],
    }),
    getOutstandingSummary: build.query<OutstandingSummary, void>({
      query: () => '/outstanding/summary',
      providesTags: ['Outstanding'],
    }),
    getCustomerAging: build.query<AgingBucket[], void>({
      query: () => '/outstanding/aging',
      providesTags: ['Outstanding'],
    }),

    // ---- Accounting ----
    getCustomerLedger: build.query<LedgerResult, string>({
      query: (customerId) => `/accounting/customer-ledger/${customerId}`,
    }),
    getSupplierLedger: build.query<LedgerResult, string>({
      query: (supplierId) => `/accounting/supplier-ledger/${supplierId}`,
    }),
    getCashBook: build.query<CashBookResult, 'cash' | 'bank'>({
      query: (kind) => `/accounting/cash-book?kind=${kind}`,
    }),
    getTrialBalance: build.query<TrialBalanceResult, void>({
      query: () => '/accounting/trial-balance',
    }),

    // ---- Crates ----
    getCrateTransactions: build.query<CrateTransaction[], void>({
      query: () => '/crates',
      providesTags: ['Crate'],
    }),
    getCrateBalances: build.query<CrateBalanceRow[], void>({
      query: () => '/crates/balances',
      providesTags: ['Crate'],
    }),
    createCrateTransaction: build.mutation<CrateTransaction, {
      date: string; partyType: 'customer' | 'supplier'; partyId: string; direction: 'out' | 'in'; quantity: number; damaged?: number; notes?: string;
    }>({
      query: (body) => ({ url: '/crates', method: 'POST', body }),
      invalidatesTags: ['Crate'],
    }),

    // ---- Rate & Weight Adjustment ----
    getAdjustments: build.query<Adjustment[], void>({
      query: () => '/adjustments',
      providesTags: ['Adjustment'],
    }),
    createAdjustment: build.mutation<Adjustment, {
      date: string; supplierId: string; itemId?: string; type: AdjustmentType;
      actualValue: number; reportedValue: number; amount: number; notes?: string;
    }>({
      query: (body) => ({ url: '/adjustments', method: 'POST', body }),
      invalidatesTags: ['Adjustment', 'Outstanding'],
    }),
  }),
});

export const {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
  useUpdateBankAccountMutation,
  useDeleteBankAccountMutation,
  useGetBankBalancesQuery,
  useGetCashTransfersQuery,
  useCreateCashTransferMutation,
  useGetExpensesQuery,
  useGetExpenseCategoriesQuery,
  useCreateExpenseMutation,
  useGetSupplierBillsQuery,
  usePreviewSupplierBillMutation,
  useCreateSupplierBillMutation,
  useGetSupplierPaymentsQuery,
  useCreateSupplierPaymentMutation,
  useGetCustomerOutstandingQuery,
  useGetSupplierOutstandingQuery,
  useGetOutstandingSummaryQuery,
  useGetCustomerAgingQuery,
  useGetCustomerLedgerQuery,
  useGetSupplierLedgerQuery,
  useGetCashBookQuery,
  useGetTrialBalanceQuery,
  useGetCrateTransactionsQuery,
  useGetCrateBalancesQuery,
  useCreateCrateTransactionMutation,
  useGetAdjustmentsQuery,
  useCreateAdjustmentMutation,
} = financeApi;
