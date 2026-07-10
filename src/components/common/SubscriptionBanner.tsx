import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { useAppSelector } from '@/store/hooks';
import { useGetMySubscriptionQuery } from '@/api/subscriptionApi';

/**
 * App-wide banner shown to org users when their subscription is locked
 * (read-only) or the free trial is about to end. Hidden for the Super Admin and
 * on the Subscription screen itself. Org Admins get a "Subscribe" shortcut.
 */
export default function SubscriptionBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const orgId = user?.organizationId ?? null;

  const { data } = useGetMySubscriptionQuery(undefined, { skip: !orgId });

  if (!orgId) return null; // platform super admin
  if (location.pathname === '/subscription') return null;

  const locked = data?.locked ?? user?.subscription?.locked ?? false;
  const status = data?.status ?? user?.subscription?.status ?? null;
  const daysLeft = data?.daysLeft ?? null;
  const trialSoon = status === 'trial' && !locked && daysLeft != null && daysLeft <= 3;

  if (!locked && !trialSoon) return null;

  const isOrgAdmin = user?.role === 'org_admin';

  return (
    <Alert
      severity={locked ? 'error' : 'warning'}
      variant={locked ? 'filled' : 'standard'}
      sx={{ borderRadius: 0 }}
      action={
        isOrgAdmin ? (
          <Button color="inherit" size="small" onClick={() => navigate('/subscription')}>
            Subscribe
          </Button>
        ) : undefined
      }
    >
      {locked
        ? `Your ${status === 'trial' ? 'free trial' : 'subscription'} has ended — the app is read-only. ${
            isOrgAdmin ? 'Subscribe to restore full access.' : 'Ask your admin to renew the subscription.'
          }`
        : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. ${
            isOrgAdmin ? 'Subscribe to avoid interruption.' : ''
          }`}
    </Alert>
  );
}
