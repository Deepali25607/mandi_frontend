import type { ComponentType } from 'react';
import type { PlatformFeature, Role } from '@/types';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AgricultureRoundedIcon from '@mui/icons-material/AgricultureRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import WidgetsRoundedIcon from '@mui/icons-material/WidgetsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import MoneyOffRoundedIcon from '@mui/icons-material/MoneyOffRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import WallpaperRoundedIcon from '@mui/icons-material/WallpaperRounded';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType;
  /** Roles allowed to see this item (org-level items). */
  roles: Role[];
  section: 'Platform' | 'Operations' | 'Masters' | 'Accounts' | 'Reports' | 'Admin';
  /** Candidate for the mobile bottom bar (top-level frequent actions). */
  primary?: boolean;
  /** Platform Super Admin item — shown ONLY to super_admin, never to org users. */
  platform?: boolean;
  /** Org subscription feature this item requires; hidden if the plan lacks it. */
  feature?: PlatformFeature;
}

const ALL: Role[] = [
  'org_admin',
  'accountant',
  'sales_operator',
  'inventory_manager',
  'collection_executive',
  'purchase_operator',
  'auditor',
];

export const NAV_ITEMS: NavItem[] = [
  // Platform (Super Admin only)
  { label: 'Platform Overview', path: '/platform', icon: InsightsRoundedIcon, roles: [], section: 'Platform', platform: true, primary: true },
  { label: 'Organizations', path: '/platform/organizations', icon: BusinessRoundedIcon, roles: [], section: 'Platform', platform: true, primary: true },
  { label: 'Plans & Pricing', path: '/platform/plans', icon: WorkspacePremiumRoundedIcon, roles: [], section: 'Platform', platform: true, primary: true },
  { label: 'Payments', path: '/platform/payments', icon: ReceiptLongRoundedIcon, roles: [], section: 'Platform', platform: true, primary: true },
  { label: 'Login & Branding', path: '/platform/branding', icon: WallpaperRoundedIcon, roles: [], section: 'Platform', platform: true },
  { label: 'Platform Settings', path: '/platform/settings', icon: SettingsRoundedIcon, roles: [], section: 'Platform', platform: true, primary: true },

  // Operations
  { label: 'Dashboard', path: '/dashboard', icon: SpaceDashboardRoundedIcon, roles: ALL, section: 'Operations', primary: true },
  { label: 'Sale Entry', path: '/sales', icon: PointOfSaleRoundedIcon, roles: ['accountant', 'sales_operator'], section: 'Operations', primary: true },
  { label: 'Arrival Entry', path: '/arrivals', icon: LocalShippingRoundedIcon, roles: ['accountant', 'purchase_operator'], section: 'Operations', primary: true },
  { label: 'Collections', path: '/collections', icon: PaymentsRoundedIcon, roles: ['accountant', 'collection_executive'], section: 'Operations', primary: true },
  { label: 'Inventory', path: '/inventory', icon: Inventory2RoundedIcon, roles: ['inventory_manager', 'accountant'], section: 'Operations', primary: true },
  { label: 'For-Sale Challan', path: '/challans', icon: SwapHorizRoundedIcon, roles: ['inventory_manager', 'accountant', 'sales_operator'], section: 'Operations', feature: 'challans' },
  { label: 'Crates', path: '/crates', icon: WidgetsRoundedIcon, roles: ['inventory_manager', 'accountant'], section: 'Operations', feature: 'crates' },

  // Masters
  { label: 'Suppliers', path: '/suppliers', icon: AgricultureRoundedIcon, roles: ['org_admin', 'accountant', 'purchase_operator'], section: 'Masters' },
  { label: 'Customers', path: '/customers', icon: GroupsRoundedIcon, roles: ['org_admin', 'accountant', 'sales_operator'], section: 'Masters' },
  { label: 'Items', path: '/items', icon: CategoryRoundedIcon, roles: ['org_admin', 'inventory_manager'], section: 'Masters' },

  // Accounts
  { label: 'Billing', path: '/billing', icon: ReceiptLongRoundedIcon, roles: ['accountant', 'sales_operator'], section: 'Accounts' },
  { label: 'Settlements', path: '/settlements', icon: HandshakeRoundedIcon, roles: ['accountant', 'org_admin'], section: 'Accounts', feature: 'settlements' },
  { label: 'Outstanding', path: '/outstanding', icon: AccountBalanceWalletRoundedIcon, roles: ['org_admin', 'accountant', 'collection_executive'], section: 'Accounts' },
  { label: 'Adjustments', path: '/adjustments', icon: TuneRoundedIcon, roles: ['accountant', 'org_admin'], section: 'Accounts', feature: 'adjustments' },
  { label: 'Expenses', path: '/expenses', icon: MoneyOffRoundedIcon, roles: ['accountant', 'org_admin'], section: 'Accounts', feature: 'expenses' },
  { label: 'Accounting', path: '/accounting', icon: CalculateRoundedIcon, roles: ['accountant', 'org_admin', 'auditor'], section: 'Accounts', feature: 'accounting' },

  // Reports
  { label: 'Reports', path: '/reports', icon: AssessmentRoundedIcon, roles: ['org_admin', 'accountant', 'auditor'], section: 'Reports', feature: 'reports' },

  // Admin
  { label: 'Organization', path: '/organization', icon: ApartmentRoundedIcon, roles: ['org_admin'], section: 'Admin' },
  { label: 'Users', path: '/users', icon: ManageAccountsRoundedIcon, roles: ['org_admin'], section: 'Admin' },
  { label: 'Roles & Access', path: '/roles', icon: AdminPanelSettingsRoundedIcon, roles: ['org_admin'], section: 'Admin' },
  { label: 'Appearance', path: '/appearance', icon: PaletteRoundedIcon, roles: ['org_admin'], section: 'Admin' },
  { label: 'Data Backup', path: '/backup', icon: BackupRoundedIcon, roles: ['org_admin'], section: 'Admin' },
  { label: 'Subscription', path: '/subscription', icon: WorkspacePremiumRoundedIcon, roles: ['org_admin'], section: 'Admin' },
];

/**
 * Visibility rules:
 * - Platform items (Super Admin console) are shown ONLY to super_admin.
 * - Super Admin sees ONLY platform items (full separation from operations).
 * - Org Admin can access EVERY org module/role (still subject to plan features).
 * - Other org roles require the item's role AND, if feature-gated, an active plan feature.
 */
export function canAccess(item: NavItem, role: Role, features: PlatformFeature[] = []): boolean {
  if (item.platform) return role === 'super_admin';
  if (role === 'super_admin') return false;
  if (item.feature && !features.includes(item.feature)) return false;
  if (role === 'org_admin') return true; // full operational access
  return item.roles.includes(role);
}

export function navItemsForRole(role: Role, features: PlatformFeature[] = []): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(item, role, features));
}
