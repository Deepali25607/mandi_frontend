import { useMemo, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useAppSelector } from '@/store/hooks';
import { buildTheme } from '@/theme/theme';

/**
 * Rebuilds the MUI theme whenever the tenant's AppearanceConfig changes, so
 * colour / radius / light-dark edits apply instantly across the whole app
 * (including the live preview on the Appearance admin page).
 */
export default function ThemedApp({ children }: { children: ReactNode }) {
  const config = useAppSelector((s) => s.appearance.config);
  const theme = useMemo(() => buildTheme(config), [config]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
