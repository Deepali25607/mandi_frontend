import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

/** Sends the user to their home surface: Super Admin → platform console, others → dashboard. */
export function RoleHome() {
  const role = useAppSelector((s) => s.auth.user?.role);
  return <Navigate to={role === 'super_admin' ? '/platform' : '/dashboard'} replace />;
}

/**
 * Keeps the two worlds separate:
 * - `platform` routes are Super-Admin-only (org users bounce to their dashboard).
 * - `org` routes are operational (Super Admin bounces to the platform console).
 */
export function RoleGuard({ scope, children }: { scope: 'platform' | 'org'; children: ReactElement }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (scope === 'platform' && role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  if (scope === 'org' && role === 'super_admin') return <Navigate to="/platform" replace />;
  return children;
}
