import { useNavigate } from 'react-router-dom';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser } from '@/store/authSlice';
import { AuthLayout } from './AuthLayout';
import { ChangePasswordForm } from './ChangePasswordForm';

/** Full-screen forced change (mustChangePassword) — also reachable voluntarily. */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const forced = Boolean(user?.mustChangePassword);

  const onSuccess = () => {
    if (user) dispatch(setUser({ ...user, mustChangePassword: false }));
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthLayout title="Set a New Password" subtitle={user?.name ?? ''}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2}>
            <Typography variant="h6">Change password</Typography>
            {forced && <Alert severity="warning">For your security, please set a new password before continuing.</Alert>}
            <ChangePasswordForm onSuccess={onSuccess} />
          </Stack>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
