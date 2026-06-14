import { createTheme, type Theme } from '@mui/material/styles';
import { DEFAULT_APPEARANCE, type AppearanceConfig } from '@/types/appearance';

/**
 * Mobile-first theme for the Mandi ERP.
 * - Fresh agricultural green primary + warm amber accent (defaults).
 * - Large touch targets (min 48px) and readable type for low-tech users.
 * - Rounded, card-driven surfaces with soft shadows.
 *
 * The palette, corner radius and light/dark mode are all driven by the
 * per-organization AppearanceConfig so admins can re-skin the whole app.
 */
export function buildTheme(config: AppearanceConfig = DEFAULT_APPEARANCE): Theme {
  const isDark = config.mode === 'dark';
  const radius = config.borderRadius;

  // Surface colours adapt to the chosen mode; borders use a single token so
  // every component (and the app shell) stays consistent in light and dark.
  const paper = isDark ? '#1c2622' : '#ffffff';
  const defaultBg = isDark ? '#101614' : '#f4f6f5';
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#e8ebe9';
  const textPrimary = isDark ? '#e8efe9' : '#1c2522';
  const textSecondary = isDark ? '#9bb0a6' : '#5d6b66';

  return createTheme({
    palette: {
      mode: config.mode,
      primary: { main: config.primaryColor, contrastText: '#fff' },
      secondary: { main: config.secondaryColor, contrastText: '#1a1a1a' },
      success: { main: '#2e9e5b' },
      error: { main: '#e23b3b' },
      warning: { main: '#f0a500' },
      info: { main: '#2f80ed' },
      background: { default: defaultBg, paper },
      text: { primary: textPrimary, secondary: textSecondary },
      divider: border,
    },
    shape: { borderRadius: radius },
    typography: {
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif",
      h4: { fontWeight: 800, letterSpacing: '-0.5px' },
      h5: { fontWeight: 800, letterSpacing: '-0.3px' },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 700, textTransform: 'none', fontSize: '1rem' },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: Math.max(8, radius - 2), minHeight: 48, paddingInline: 20 },
          sizeLarge: { minHeight: 56, fontSize: '1.05rem' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: radius + 2 },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: radius + 4,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 1px 2px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.04)',
          },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: Math.max(8, radius - 2) } },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: { minWidth: 'auto', paddingTop: 8 },
          label: { fontSize: '0.7rem', '&.Mui-selected': { fontSize: '0.72rem' } },
        },
      },
    },
  });
}

/** Default theme (used before any tenant customisation is loaded). */
export const theme = buildTheme(DEFAULT_APPEARANCE);
