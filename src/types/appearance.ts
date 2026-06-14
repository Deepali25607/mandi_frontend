/** Per-organization Theme & Wallpaper configuration (mirrors the backend). */
export type WallpaperType = 'none' | 'color' | 'gradient' | 'image';
export type ThemeMode = 'light' | 'dark';

/** Look of the navigation sidebar (and mobile menu). */
export type SidebarVariant = 'default' | 'dark' | 'primary' | 'accent';

export interface WallpaperConfig {
  type: WallpaperType;
  /** Hex colour, CSS gradient string, or a base64 data URL (uploaded image). */
  value: string;
  /** Strength of the readability scrim laid over the wallpaper (0–1). */
  opacity: number;
}

export interface AppearanceConfig {
  primaryColor: string;
  secondaryColor: string;
  mode: ThemeMode;
  borderRadius: number;
  sidebar: SidebarVariant;
  wallpaper: WallpaperConfig;
}

/** Built-in Mandi look — the starting point and the "Reset" target. */
export const DEFAULT_APPEARANCE: AppearanceConfig = {
  primaryColor: '#1f8a4c',
  secondaryColor: '#f0a500',
  mode: 'light',
  borderRadius: 14,
  sidebar: 'default',
  wallpaper: { type: 'none', value: '', opacity: 0.5 },
};

/** Sidebar style choices shown in the Appearance editor. */
export const SIDEBAR_VARIANTS: { id: SidebarVariant; name: string; hint: string }[] = [
  { id: 'default', name: 'Default', hint: 'Light panel, brand-coloured selection' },
  { id: 'dark', name: 'Dark', hint: 'Charcoal panel, always dark' },
  { id: 'primary', name: 'Branded', hint: 'Filled with your primary colour' },
  { id: 'accent', name: 'Accent', hint: 'Filled with your accent colour' },
];

/** Ready-made colour schemes the admin can apply in one click. */
export interface PalettePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { id: 'mandi', name: 'Mandi Green', primary: '#1f8a4c', secondary: '#f0a500' },
  { id: 'indigo', name: 'Indigo', primary: '#4f46e5', secondary: '#f59e0b' },
  { id: 'ocean', name: 'Ocean Blue', primary: '#0277bd', secondary: '#26c6da' },
  { id: 'sunset', name: 'Sunset', primary: '#e0533d', secondary: '#f5a623' },
  { id: 'teal', name: 'Teal', primary: '#0f766e', secondary: '#eab308' },
  { id: 'berry', name: 'Berry', primary: '#9d2c5b', secondary: '#f472b6' },
  { id: 'slate', name: 'Graphite', primary: '#334155', secondary: '#38bdf8' },
  { id: 'royal', name: 'Royal Purple', primary: '#6d28d9', secondary: '#22d3ee' },
];

/** Ready-made CSS-gradient wallpapers (no external image files needed). */
export interface GradientPreset {
  id: string;
  name: string;
  value: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'meadow', name: 'Meadow', value: 'linear-gradient(135deg, #d3f4e0 0%, #f4f6f5 60%)' },
  { id: 'sunrise', name: 'Sunrise', value: 'linear-gradient(135deg, #ffe9c7 0%, #ffd6d6 100%)' },
  { id: 'sky', name: 'Sky', value: 'linear-gradient(135deg, #d6ecff 0%, #eef2ff 100%)' },
  { id: 'mint', name: 'Mint', value: 'linear-gradient(160deg, #e0f7f4 0%, #f7fbff 100%)' },
  { id: 'dusk', name: 'Dusk', value: 'linear-gradient(135deg, #2b2d42 0%, #1a1a2e 100%)' },
  { id: 'forest', name: 'Forest', value: 'linear-gradient(135deg, #0f3d2e 0%, #14532d 100%)' },
  { id: 'aurora', name: 'Aurora', value: 'linear-gradient(135deg, #cdeffd 0%, #e3d6ff 50%, #ffe1f0 100%)' },
  { id: 'sand', name: 'Sand', value: 'linear-gradient(135deg, #f5ecd7 0%, #efe3c8 100%)' },
];
