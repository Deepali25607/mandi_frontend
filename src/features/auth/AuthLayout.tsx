import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

/** Shared gradient wrapper for the login / register / recovery screens. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
        background: 'linear-gradient(160deg, #1f8a4c 0%, #13652f 60%, #0e4a23 100%)',
      }}
    >
      <Stack spacing={1.5} alignItems="center" sx={{ mb: 3, color: '#fff', textAlign: 'center' }}>
        <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center' }}>
          <StorefrontRoundedIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>{title}</Typography>
        <Typography sx={{ opacity: 0.85 }}>{subtitle}</Typography>
      </Stack>
      {children}
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mt: 3 }}>
        Secure username &amp; password login · Role-based access
      </Typography>
    </Box>
  );
}
