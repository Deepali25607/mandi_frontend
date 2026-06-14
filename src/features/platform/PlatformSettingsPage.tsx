import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useGetPlatformSettingsQuery, useUpdatePlatformSettingMutation } from '@/api/platformApi';

export default function PlatformSettingsPage() {
  const { data: settings, isLoading } = useGetPlatformSettingsQuery();
  const [update, { isLoading: saving }] = useUpdatePlatformSettingMutation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setValues(Object.fromEntries(settings.map((s) => [s.key, s.value ?? ''])));
  }, [settings]);

  const saveOne = async (key: string) => {
    await update({ key, value: values[key] ?? '' }).unwrap();
    setToast('Setting saved');
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Platform Settings</Typography>
        <Typography variant="body2" color="text.secondary">Global configuration applied across all tenants.</Typography>
      </Box>

      {isLoading && <LinearProgress />}
      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            {(settings ?? []).map((s) => (
              <Stack key={s.key} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
                <TextField
                  label={s.label ?? s.key}
                  value={values[s.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                  helperText={s.key}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={() => saveOne(s.key)}
                  disabled={saving || (values[s.key] ?? '') === (s.value ?? '')}
                  sx={{ mb: { sm: 2.5 } }}
                >
                  Save
                </Button>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
