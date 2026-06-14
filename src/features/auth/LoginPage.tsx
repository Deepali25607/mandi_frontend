import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useLoginMutation } from '@/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import { AuthLayout } from './AuthLayout';

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await login({ username, password }).unwrap();
      dispatch(setCredentials(res));
      navigate(res.user.mustChangePassword ? '/change-password' : '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your username and password.'));
    }
  };

  return (
    <AuthLayout>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <form onSubmit={submit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6">Sign in</Typography>
                <Typography variant="body2" color="text.secondary">Use your username and password.</Typography>
              </Box>

              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                InputProps={{ startAdornment: <InputAdornment position="start"><StorefrontRoundedIcon fontSize="small" /></InputAdornment> }}
              />
              <TextField
                label="Password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPw((s) => !s)} edge="end" size="small">
                        {showPw ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {error && <Alert severity="error">{error}</Alert>}

              <Button type="submit" size="large" variant="contained" disabled={!username || !password || isLoading}>
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/forgot-password" underline="hover">Forgot password?</Link>
              </Box>

              <Divider>
                <Typography variant="caption" color="text.secondary">New to Mandi ERP?</Typography>
              </Divider>
              <Button component={RouterLink} to="/register" variant="outlined" size="large">
                Create an organization account
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
