import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useLazyGetRecoveryQuestionQuery, useRecoverMutation } from '@/api/authApi';
import { AuthLayout } from './AuthLayout';

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [fetchQuestion, { isFetching }] = useLazyGetRecoveryQuestionQuery();
  const [recover, { isLoading }] = useRecoverMutation();

  const [step, setStep] = useState<'username' | 'answer' | 'done'>('username');
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadQuestion = async () => {
    setError(null);
    try {
      const res = await fetchQuestion(username).unwrap();
      setQuestion(res.question);
      setStep('answer');
    } catch (err) {
      setError(errorMessage(err, 'No recovery question found. Please contact your admin to reset your password.'));
    }
  };

  const doRecover = async () => {
    setError(null);
    try {
      await recover({ username, answer, newPassword }).unwrap();
      setStep('done');
    } catch (err) {
      setError(errorMessage(err, 'Recovery failed.'));
    }
  };

  return (
    <AuthLayout title="Recover Access" subtitle="Reset your password with your security question">
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2.5}>
            {step === 'username' && (
              <>
                <Typography variant="h6">Forgot password</Typography>
                <Typography variant="body2" color="text.secondary">Enter your username to retrieve your security question.</Typography>
                <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
                {error && <Alert severity="error">{error}</Alert>}
                <Button size="large" variant="contained" onClick={loadQuestion} disabled={!username || isFetching}>
                  {isFetching ? 'Checking…' : 'Continue'}
                </Button>
              </>
            )}

            {step === 'answer' && (
              <>
                <Typography variant="h6">Security question</Typography>
                <Alert severity="info">{question}</Alert>
                <TextField label="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
                <TextField label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="At least 6 characters" />
                {error && <Alert severity="error">{error}</Alert>}
                <Button size="large" variant="contained" onClick={doRecover} disabled={!answer || newPassword.length < 6 || isLoading}>
                  {isLoading ? 'Resetting…' : 'Reset password'}
                </Button>
              </>
            )}

            {step === 'done' && (
              <>
                <Alert severity="success">Password reset. You can now sign in with your new password.</Alert>
                <Button size="large" variant="contained" onClick={() => navigate('/login')}>Back to sign in</Button>
              </>
            )}

            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" underline="hover">Back to sign in</Link>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
