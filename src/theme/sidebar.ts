import { alpha, type Theme } from '@mui/material/styles';
import type { SidebarVariant } from '@/types/appearance';

export interface SidebarPalette {
  bg: string;
  color: string;
  subheaderColor: string;
  iconColor: string;
  borderColor: string;
  hoverBg: string;
  selectedBg: string;
  selectedColor: string;
  selectedHoverBg: string;
}

/**
 * Resolves the navigation sidebar's colours from the chosen variant, derived
 * from the active theme so "Branded" / "Accent" follow the org's colours and
 * "Default" matches light/dark mode.
 */
export function sidebarPalette(variant: SidebarVariant, theme: Theme): SidebarPalette {
  const { primary, secondary } = theme.palette;

  if (variant === 'dark') {
    return {
      bg: '#1c2622',
      color: '#e8efe9',
      subheaderColor: alpha('#e8efe9', 0.6),
      iconColor: alpha('#e8efe9', 0.7),
      borderColor: alpha('#ffffff', 0.12),
      hoverBg: alpha('#ffffff', 0.08),
      selectedBg: primary.main,
      selectedColor: primary.contrastText,
      selectedHoverBg: primary.dark ?? primary.main,
    };
  }

  if (variant === 'primary' || variant === 'accent') {
    const base = variant === 'primary' ? primary : secondary;
    const onBase = base.contrastText || '#fff';
    const dark = onBase.toLowerCase() === '#fff' || onBase.toLowerCase() === '#ffffff';
    return {
      bg: base.main,
      color: onBase,
      subheaderColor: alpha(onBase, 0.7),
      iconColor: alpha(onBase, 0.85),
      borderColor: alpha(onBase, 0.18),
      hoverBg: alpha(onBase, 0.12),
      // A translucent veil reads as "selected" on a coloured panel.
      selectedBg: alpha(dark ? '#ffffff' : '#000000', 0.22),
      selectedColor: onBase,
      selectedHoverBg: alpha(dark ? '#ffffff' : '#000000', 0.3),
    };
  }

  // default — follows the theme surface.
  return {
    bg: theme.palette.background.paper,
    color: theme.palette.text.primary,
    subheaderColor: theme.palette.text.secondary,
    iconColor: theme.palette.text.secondary,
    borderColor: theme.palette.divider,
    hoverBg: theme.palette.action.hover,
    selectedBg: primary.main,
    selectedColor: primary.contrastText,
    selectedHoverBg: primary.dark ?? primary.main,
  };
}
