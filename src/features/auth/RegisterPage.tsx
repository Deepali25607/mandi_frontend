import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useRegisterOrganizationMutation } from '@/api/authApi';
import { useGetPublicPlansQuery } from '@/api/platformApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import { AuthLayout } from './AuthLayout';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterOrganizationMutation();
  const { data: plans } = useGetPublicPlansQuery();

  const [form, setForm] = useState({ organizationName: '', adminName: '', username: '', password: '', confirm: '', mobile: '' });
  const [planId, setPlanId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plans?.length && !planId) setPlanId((plans.find((p) => p.isDefault) ?? plans[0]).id);
  }, [plans, planId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;
  const canSubmit = form.organizationName.trim() && form.adminName.trim() && form.username.length >= 3 && form.password.length >= 6 && !mismatch;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await register({
        organizationName: form.organizationName,
        adminName: form.adminName,
        username: form.username,
        password: form.password,
        mobile: form.mobile || undefined,
        planId: planId || undefined,
      }).unwrap();
      dispatch(setCredentials(res));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account.'));
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Set up your mandi organization">
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <Typography variant="h6">Organization details</Typography>
              <TextField label="Organization name" value={form.organizationName} onChange={set('organizationName')} autoFocus />
              <TextField label="Your name (admin)" value={form.adminName} onChange={set('adminName')} />
              <TextField label="Mobile (optional)" value={form.mobile} onChange={set('mobile')} />

              {Boolean(plans?.length) && (
                <>
                  <Typography variant="h6" sx={{ pt: 1 }}>Choose a plan</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                    Start on a 14-day trial. You can change plans anytime.
                  </Typography>
                  <Stack spacing={1}>
                    {plans!.map((p) => {
                      const selected = planId === p.id;
                      return (
                        <Card key={p.id} variant="outlined" sx={{ borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}>
                          <CardActionArea onClick={() => setPlanId(p.id)} sx={{ p: 1.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ flexGrow: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                                  {p.priceMonthly === 0 && <Chip size="small" color="success" label="Free" />}
                                </Stack>
                                {p.description && <Typography variant="caption" color="text.secondary">{p.description}</Typography>}
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{inr(p.priceMonthly)}</Typography>
                                <Typography variant="caption" color="text.secondary">/month</Typography>
                              </Box>
                              {selected && <CheckRoundedIcon color="primary" />}
                            </Stack>
                          </CardActionArea>
                        </Card>
                      );
                    })}
                  </Stack>
                </>
              )}

              <Typography variant="h6" sx={{ pt: 1 }}>Login credentials</Typography>
              <TextField label="Username" value={form.username} onChange={set('username')} helperText="At least 3 characters; letters, numbers, . _ -" autoComplete="username" />
              <TextField label="Password" type="password" value={form.password} onChange={set('password')} helperText="At least 6 characters" autoComplete="new-password" />
              <TextField label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} error={mismatch} helperText={mismatch ? 'Passwords do not match' : ' '} autoComplete="new-password" />

              {error && <Alert severity="error">{error}</Alert>}

              <Button type="submit" size="large" variant="contained" disabled={!canSubmit || isLoading}>
                {isLoading ? 'Creating…' : 'Create account'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/login" underline="hover">Already have an account? Sign in</Link>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
