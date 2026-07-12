import type { ComponentType } from 'react';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AgricultureRoundedIcon from '@mui/icons-material/AgricultureRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import MoneyOffRoundedIcon from '@mui/icons-material/MoneyOffRounded';
import type { PlatformFeature } from '@/types';
import { SalesRegisterReport, SaleItemRegisterReport, SupplierSaleRegisterReport, ItemWiseSalesReport } from './modules/SalesReports';
import { PurchaseRegisterReport, ItemWisePurchaseReport } from './modules/PurchaseReports';
import { StockSummaryReport, StockLotReport, ItemMasterReport } from './modules/InventoryReports';
import { CollectionRegisterReport } from './modules/CollectionReports';
import {
  TrialBalanceReport, CashBookReport, BankBookReport, CustomerLedgerReport, SupplierLedgerReport,
} from './modules/AccountingReports';
import { CustomerOutstandingReport, CustomerMasterReport } from './modules/CustomerReports';
import { SupplierOutstandingReport, SupplierMasterReport } from './modules/SupplierReports';
import { SupplierBillReport, SupplierPaymentReport, ExpenseRegisterReport } from './modules/FinanceReports';

export type ReportModule =
  | 'Sales' | 'Purchase' | 'Inventory' | 'Collection' | 'Accounting'
  | 'Customers' | 'Suppliers' | 'Settlements' | 'Expenses';

export interface ReportDef {
  key: string;
  module: ReportModule;
  title: string;
  description: string;
  /** Subscription feature required to use this report (hidden + enforced otherwise). */
  feature?: PlatformFeature;
  Component: ComponentType;
}

export const MODULE_META: Record<ReportModule, { icon: ComponentType; blurb: string }> = {
  Sales: { icon: PointOfSaleRoundedIcon, blurb: 'Invoices and item-wise sales' },
  Purchase: { icon: LocalShippingRoundedIcon, blurb: 'Arrivals and item-wise purchases' },
  Inventory: { icon: Inventory2RoundedIcon, blurb: 'Stock, lots and item master' },
  Collection: { icon: PaymentsRoundedIcon, blurb: 'Customer receipts' },
  Accounting: { icon: CalculateRoundedIcon, blurb: 'Ledgers, cash/bank book, trial balance' },
  Customers: { icon: GroupsRoundedIcon, blurb: 'Receivables and customer master' },
  Suppliers: { icon: AgricultureRoundedIcon, blurb: 'Payables and supplier master' },
  Settlements: { icon: HandshakeRoundedIcon, blurb: 'Supplier bills and payments' },
  Expenses: { icon: MoneyOffRoundedIcon, blurb: 'Operating expenses' },
};

/** Display order of modules on the reports landing page. */
export const MODULE_ORDER: ReportModule[] = [
  'Sales', 'Purchase', 'Inventory', 'Collection', 'Accounting', 'Customers', 'Suppliers', 'Settlements', 'Expenses',
];

export const REPORTS: ReportDef[] = [
  { key: 'sales-register', module: 'Sales', title: 'Sales Register', description: 'All sales with commission and market fee.', Component: SalesRegisterReport },
  { key: 'sale-item-register', module: 'Sales', title: 'Sale Item Register', description: 'Every item line sold, with lot and value.', Component: SaleItemRegisterReport },
  { key: 'item-wise-sales', module: 'Sales', title: 'Item-wise Sales', description: 'Quantity, weight and value sold per item.', Component: ItemWiseSalesReport },

  { key: 'purchase-register', module: 'Purchase', title: 'Purchase Register', description: 'Arrivals received from suppliers.', Component: PurchaseRegisterReport },
  { key: 'item-wise-purchase', module: 'Purchase', title: 'Item-wise Purchase', description: 'Quantity, weight and value purchased per item.', Component: ItemWisePurchaseReport },

  { key: 'stock-summary', module: 'Inventory', title: 'Stock Summary', description: 'Available stock and value by item.', Component: StockSummaryReport },
  { key: 'stock-lots', module: 'Inventory', title: 'Stock Lot Register', description: 'Lot-wise inventory with drawdown.', Component: StockLotReport },
  { key: 'item-master', module: 'Inventory', title: 'Item Master', description: 'Items with default commission and fee.', Component: ItemMasterReport },

  { key: 'collection-register', module: 'Collection', title: 'Collection Register', description: 'Customer payments received.', Component: CollectionRegisterReport },

  { key: 'trial-balance', module: 'Accounting', title: 'Trial Balance', description: 'Summary of account balances.', feature: 'accounting', Component: TrialBalanceReport },
  { key: 'cash-book', module: 'Accounting', title: 'Cash Book', description: 'Cash inflows and outflows.', feature: 'accounting', Component: CashBookReport },
  { key: 'bank-book', module: 'Accounting', title: 'Bank Book', description: 'Bank inflows and outflows.', feature: 'accounting', Component: BankBookReport },
  { key: 'customer-ledger', module: 'Accounting', title: 'Customer Ledger', description: 'Sales (Dr) and receipts (Cr) per customer.', feature: 'accounting', Component: CustomerLedgerReport },
  { key: 'supplier-ledger', module: 'Accounting', title: 'Supplier Ledger', description: 'Bills (Cr) and payments (Dr) per supplier.', feature: 'accounting', Component: SupplierLedgerReport },

  { key: 'customer-outstanding', module: 'Customers', title: 'Customer Outstanding', description: 'Receivables per customer.', Component: CustomerOutstandingReport },
  { key: 'customer-master', module: 'Customers', title: 'Customer Master', description: 'All customers with credit limits.', Component: CustomerMasterReport },

  { key: 'supplier-outstanding', module: 'Suppliers', title: 'Supplier Outstanding', description: 'Payables per supplier.', Component: SupplierOutstandingReport },
  { key: 'supplier-wise-sales', module: 'Suppliers', title: 'Supplier-wise Sales', description: 'Sold-lot lines attributed to each supplier, with net payable.', Component: SupplierSaleRegisterReport },
  { key: 'supplier-master', module: 'Suppliers', title: 'Supplier Master', description: 'All suppliers with commission rates.', Component: SupplierMasterReport },

  { key: 'supplier-bills', module: 'Settlements', title: 'Supplier Bills', description: 'Settlement bills with deductions.', feature: 'settlements', Component: SupplierBillReport },
  { key: 'supplier-payments', module: 'Settlements', title: 'Supplier Payments', description: 'Payments made to suppliers.', feature: 'settlements', Component: SupplierPaymentReport },

  { key: 'expense-register', module: 'Expenses', title: 'Expense Register', description: 'Operating expenses by category.', feature: 'expenses', Component: ExpenseRegisterReport },
];

export const reportByKey = (key: string) => REPORTS.find((r) => r.key === key);
