import { useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useChangePasswordMutation } from '@/api/authApi';

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const canSubmit = currentPassword && newPassword.length >= 6 && !mismatch;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setOk(true);
      setCurrent(''); setNew(''); setConfirm('');
      onSuccess?.();
    } catch (err) {
      setError(errorMessage(err, 'Could not change password.'));
    }
  };

  return (
    <form onSubmit={submit}>
      <Stack spacing={2}>
        <TextField label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <TextField label="New password" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} helperText="At least 6 characters" autoComplete="new-password" />
        <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch} helperText={mismatch ? 'Passwords do not match' : ' '} autoComplete="new-password" />
        {error && <Alert severity="error">{error}</Alert>}
        {ok && <Alert severity="success">Password changed.</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={!canSubmit || isLoading}>
          {isLoading ? 'Saving…' : 'Change password'}
        </Button>
      </Stack>
    </form>
  );
}
