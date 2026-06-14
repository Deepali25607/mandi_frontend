import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

/**
 * Blocks access to the app shell while the user must change their password
 * (e.g. right after admin onboarding or a password reset).
 */
export default function RequirePasswordChange({ children }: { children: ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}
