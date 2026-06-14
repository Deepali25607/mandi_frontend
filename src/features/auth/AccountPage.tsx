import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSetSecurityQuestionMutation } from '@/api/authApi';
import { useAppSelector } from '@/store/hooks';
import { ChangePasswordForm } from './ChangePasswordForm';

const PRESET_QUESTIONS = [
  'Which city is your mandi in?',
  'What is your mother’s maiden name?',
  'What was the name of your first pet?',
  'What is your favourite crop?',
  'In which year did you start your business?',
];

export default function AccountPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [setSecurityQuestion, { isLoading }] = useSetSecurityQuestionMutation();
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveQuestion = async () => {
    setError(null);
    try {
      await setSecurityQuestion({ question, answer }).unwrap();
      setDone(true);
      setAnswer('');
    } catch {
      setError('Could not save security question.');
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Account &amp; Security</Typography>

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">Signed in as</Typography>
            <Typography sx={{ fontWeight: 700 }}>{user?.name} · {user?.roleLabel}</Typography>
            <Typography variant="body2" color="text.secondary">Username: {user?.username}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Change password</Typography>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Security question</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Used to recover your account if you forget your password — no email or SMS needed.
          </Typography>
          <Stack spacing={2}>
            <TextField select label="Question" value={question} onChange={(e) => setQuestion(e.target.value)}>
              {PRESET_QUESTIONS.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
            </TextField>
            <TextField label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} helperText="Remember this — you'll need it to recover access." />
            {error && <Alert severity="error">{error}</Alert>}
            {done && <Alert severity="success">Security question saved.</Alert>}
            <Button variant="contained" onClick={saveQuestion} disabled={!answer || isLoading}>
              {isLoading ? 'Saving…' : 'Save security question'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
