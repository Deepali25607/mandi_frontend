import type { SxProps, Theme } from '@mui/material/styles';
import type { AppearanceConfig } from '@/types/appearance';

/**
 * Builds the `sx` for the app-shell root so the chosen wallpaper sits behind
 * all content. A translucent scrim (driven by `opacity`) is layered over
 * gradients/images to keep text readable; cards float above it on their own
 * opaque paper surfaces.
 */
export function wallpaperSx(config: AppearanceConfig): SxProps<Theme> {
  const { wallpaper, mode } = config;
  if (wallpaper.type === 'none' || !wallpaper.value) {
    return { bgcolor: 'background.default' };
  }

  const scrimRgb = mode === 'dark' ? '16,22,20' : '255,255,255';
  const scrim = `linear-gradient(rgba(${scrimRgb},${wallpaper.opacity}), rgba(${scrimRgb},${wallpaper.opacity}))`;

  if (wallpaper.type === 'color') {
    return { bgcolor: wallpaper.value };
  }

  const layer =
    wallpaper.type === 'image' ? `url("${wallpaper.value}")` : wallpaper.value;

  return {
    backgroundColor: 'background.default',
    backgroundImage: `${scrim}, ${layer}`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
  };
}
