import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import PlaceholderPage from '@/components/common/PlaceholderPage';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ChangePasswordPage from '@/features/auth/ChangePasswordPage';
import AccountPage from '@/features/auth/AccountPage';
import RequirePasswordChange from '@/components/common/RequirePasswordChange';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ItemsPage from '@/features/masters/ItemsPage';
import SuppliersPage from '@/features/masters/SuppliersPage';
import CustomersPage from '@/features/masters/CustomersPage';
import InventoryPage from '@/features/inventory/InventoryPage';
import ArrivalEntryPage from '@/features/operations/ArrivalEntryPage';
import SaleEntryPage from '@/features/operations/SaleEntryPage';
import CratesPage from '@/features/operations/CratesPage';
import ChallansPage from '@/features/operations/ChallansPage';
import CollectionsPage from '@/features/finance/CollectionsPage';
import AdjustmentsPage from '@/features/finance/AdjustmentsPage';
import ExpensesPage from '@/features/finance/ExpensesPage';
import OutstandingPage from '@/features/finance/OutstandingPage';
import BankAccountsPage from '@/features/finance/BankAccountsPage';
import BillingPage from '@/features/finance/BillingPage';
import SettlementsPage from '@/features/finance/SettlementsPage';
import AccountingPage from '@/features/finance/AccountingPage';
import OrganizationPage from '@/features/admin/OrganizationPage';
import UsersPage from '@/features/admin/UsersPage';
import RolesPage from '@/features/admin/RolesPage';
import AppearancePage from '@/features/admin/AppearancePage';
import BackupPage from '@/features/admin/BackupPage';
import SubscriptionPage from '@/features/admin/SubscriptionPage';
import ReportsPage from '@/features/reports/ReportsPage';
import ReportRunnerPage from '@/features/reports/ReportRunnerPage';
import PlatformDashboardPage from '@/features/platform/PlatformDashboardPage';
import OrganizationsPage from '@/features/platform/OrganizationsPage';
import PlansPage from '@/features/platform/PlansPage';
import PlatformPaymentsPage from '@/features/platform/PlatformPaymentsPage';
import BrandingPage from '@/features/platform/BrandingPage';
import PlatformSettingsPage from '@/features/platform/PlatformSettingsPage';
import { RoleGuard, RoleHome } from '@/components/common/RoleGuard';
import { NAV_ITEMS } from '@/components/layout/navConfig';

// Modules with real screens; everything else renders a "Coming soon" placeholder.
const IMPLEMENTED = new Set([
  '/dashboard',
  '/sales',
  '/arrivals',
  '/inventory',
  '/suppliers',
  '/customers',
  '/items',
  '/collections',
  '/billing',
  '/settlements',
  '/outstanding',
  '/bank-accounts',
  '/expenses',
  '/accounting',
  '/crates',
  '/challans',
  '/adjustments',
  '/organization',
  '/users',
  '/roles',
  '/appearance',
  '/backup',
  '/subscription',
  '/reports',
  '/platform',
  '/platform/organizations',
  '/platform/plans',
  '/platform/payments',
  '/platform/branding',
  '/platform/settings',
]);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Forced/voluntary password change — protected but outside the app shell. */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <RequirePasswordChange>
              <AppShell />
            </RequirePasswordChange>
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleHome />} />
        <Route path="/account" element={<AccountPage />} />

        {/* Platform Super Admin console (separate from operations) */}
        <Route path="/platform" element={<RoleGuard scope="platform"><PlatformDashboardPage /></RoleGuard>} />
        <Route path="/platform/organizations" element={<RoleGuard scope="platform"><OrganizationsPage /></RoleGuard>} />
        <Route path="/platform/plans" element={<RoleGuard scope="platform"><PlansPage /></RoleGuard>} />
        <Route path="/platform/payments" element={<RoleGuard scope="platform"><PlatformPaymentsPage /></RoleGuard>} />
        <Route path="/platform/branding" element={<RoleGuard scope="platform"><BrandingPage /></RoleGuard>} />
        <Route path="/platform/settings" element={<RoleGuard scope="platform"><PlatformSettingsPage /></RoleGuard>} />

        <Route path="/dashboard" element={<RoleGuard scope="org"><DashboardPage /></RoleGuard>} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/sales" element={<SaleEntryPage />} />
        <Route path="/arrivals" element={<ArrivalEntryPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/settlements" element={<SettlementsPage />} />
        <Route path="/outstanding" element={<OutstandingPage />} />
        <Route path="/bank-accounts" element={<BankAccountsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/accounting" element={<AccountingPage />} />
        <Route path="/crates" element={<CratesPage />} />
        <Route path="/challans" element={<ChallansPage />} />
        <Route path="/adjustments" element={<AdjustmentsPage />} />
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/appearance" element={<AppearancePage />} />
        <Route path="/subscription" element={<RoleGuard scope="org"><SubscriptionPage /></RoleGuard>} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportKey" element={<ReportRunnerPage />} />

        {NAV_ITEMS.filter((i) => !IMPLEMENTED.has(i.path)).map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <PlaceholderPage
                title={item.label}
                description={`The "${item.label}" module is part of the BRD roadmap and will be implemented in an upcoming iteration.`}
              />
            }
          />
        ))}
      </Route>

      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
}
