import { useMemo, type ReactNode } from 'react';
import { Box, Stack, ThemeProvider, Typography } from '@mui/material';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useGetPublicBrandingQuery } from '@/api/platformApi';
import { DEFAULT_APPEARANCE, DEFAULT_BRANDING } from '@/types/appearance';
import { buildTheme } from '@/theme/theme';

/**
 * Shared wrapper for the login / register / recovery screens. The background,
 * brand colour and app name/tagline are controlled by the Platform Super Admin
 * (public branding endpoint) so the home screen is themeable without any
 * organization context.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { data } = useGetPublicBrandingQuery();
  const brand = data ?? DEFAULT_BRANDING;

  // Theme the auth card (buttons/links) with the platform's brand colour.
  const theme = useMemo(
    () => buildTheme({ ...DEFAULT_APPEARANCE, primaryColor: brand.primaryColor }),
    [brand.primaryColor],
  );

  const bg = brand.background;
  const backgroundSx =
    bg.type === 'image'
      ? { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: bg.value }; // gradient or solid colour

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          ...backgroundSx,
        }}
      >
        <Stack spacing={1.5} alignItems="center" sx={{ mb: 3, color: '#fff', textAlign: 'center' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center' }}>
            <StorefrontRoundedIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{title ?? brand.appName}</Typography>
          <Typography sx={{ opacity: 0.85 }}>{subtitle ?? brand.tagline}</Typography>
        </Stack>
        {children}
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mt: 3 }}>
          Secure username &amp; password login · Role-based access
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
