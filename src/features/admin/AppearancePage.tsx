import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Slider,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAppearance } from '@/store/appearanceSlice';
import { useGetAppearanceQuery, useUpdateAppearanceMutation } from '@/api/appearanceApi';
import {
  DEFAULT_APPEARANCE,
  GRADIENT_PRESETS,
  PALETTE_PRESETS,
  SIDEBAR_VARIANTS,
  type AppearanceConfig,
  type WallpaperType,
} from '@/types/appearance';
import { sidebarPalette } from '@/theme/sidebar';
import { buildTheme } from '@/theme/theme';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB — inlined as a data URL (dev-only).

export default function AppearancePage() {
  const dispatch = useAppDispatch();
  const live = useAppSelector((s) => s.appearance.config);
  const { data: saved } = useGetAppearanceQuery();
  const [save, { isLoading: saving }] = useUpdateAppearanceMutation();

  // The draft is the single source of truth for the editor; every change is
  // pushed to the store immediately so the whole app previews it live.
  const [draft, setDraft] = useState<AppearanceConfig>(live);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const baseline = saved ?? DEFAULT_APPEARANCE;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  const apply = (next: AppearanceConfig) => {
    setDraft(next);
    dispatch(setAppearance(next)); // live preview across the app
  };
  const patch = (p: Partial<AppearanceConfig>) => apply({ ...draft, ...p });
  const patchWallpaper = (p: Partial<AppearanceConfig['wallpaper']>) =>
    apply({ ...draft, wallpaper: { ...draft.wallpaper, ...p } });

  const onSave = async () => {
    setError(null);
    try {
      const result = await save(draft).unwrap();
      dispatch(setAppearance(result));
      setDraft(result);
      setToast('Appearance saved for your organization');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save appearance.');
    }
  };

  const onDiscard = () => apply(baseline);
  const onReset = () => apply(DEFAULT_APPEARANCE);

  const onPickImage = (file?: File | null) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patchWallpaper({ type: 'image', value: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const activePalette = PALETTE_PRESETS.find(
    (p) => p.primary.toLowerCase() === draft.primaryColor.toLowerCase() &&
      p.secondary.toLowerCase() === draft.secondaryColor.toLowerCase(),
  );

  return (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---------- Controls (left) ---------- */}
      <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteRoundedIcon color="primary" /> Theme &amp; Wallpaper
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customize the look of the app for everyone in your organization. Changes preview instantly — click
            <b> Save</b> to apply them for all users.
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Colour scheme presets */}
        <Card>
          <CardContent>
            <SectionTitle>Colour scheme</SectionTitle>
            <Typography variant="caption" color="text.secondary">
              Pick a ready-made scheme or set your own brand colours below.
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                mt: 1.5,
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              }}
            >
              {PALETTE_PRESETS.map((p) => {
                const active = activePalette?.id === p.id;
                return (
                  <Box
                    key={p.id}
                    onClick={() => patch({ primaryColor: p.primary, secondaryColor: p.secondary })}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2,
                      p: 1,
                      border: '2px solid',
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: active ? 'action.hover' : 'transparent',
                      transition: 'border-color .15s',
                    }}
                  >
                    <Stack direction="row" spacing={0.5} sx={{ mb: 0.75 }}>
                      <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: p.primary }} />
                      <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: p.secondary }} />
                    </Stack>
                    <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{p.name}</Typography>
                  </Box>
                );
              })}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2.5 }}>
              <ColorField label="Primary colour" value={draft.primaryColor} onChange={(v) => patch({ primaryColor: v })} />
              <ColorField label="Accent colour" value={draft.secondaryColor} onChange={(v) => patch({ secondaryColor: v })} />
            </Stack>
          </CardContent>
        </Card>

        {/* Mode + radius */}
        <Card>
          <CardContent>
            <SectionTitle>Mode &amp; shape</SectionTitle>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 1.5 }} alignItems={{ sm: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Appearance mode</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={draft.mode}
                  onChange={(_, v) => v && patch({ mode: v })}
                >
                  <ToggleButton value="light"><LightModeRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> Light</ToggleButton>
                  <ToggleButton value="dark"><DarkModeRoundedIcon fontSize="small" sx={{ mr: 0.5 }} /> Dark</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Corner radius — {draft.borderRadius}px
                </Typography>
                <Slider
                  value={draft.borderRadius}
                  min={0}
                  max={28}
                  step={1}
                  marks={[{ value: 0, label: 'Square' }, { value: 14, label: 'Default' }, { value: 28, label: 'Round' }]}
                  onChange={(_, v) => patch({ borderRadius: v as number })}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Sidebar style */}
        <Card>
          <CardContent>
            <SectionTitle>Sidebar style</SectionTitle>
            <Typography variant="caption" color="text.secondary">
              Controls the look of the navigation menu (and the mobile menu).
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                mt: 1.5,
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              }}
            >
              {SIDEBAR_VARIANTS.map((v) => {
                const active = draft.sidebar === v.id;
                const sp = sidebarPalette(v.id, buildTheme(draft));
                return (
                  <Box
                    key={v.id}
                    onClick={() => patch({ sidebar: v.id })}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2,
                      p: 1,
                      border: '2px solid',
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: active ? 'action.hover' : 'transparent',
                    }}
                  >
                    {/* mini sidebar swatch */}
                    <Box sx={{ height: 46, borderRadius: 1.5, bgcolor: sp.bg, border: `1px solid ${sp.borderColor}`, p: 0.6, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                      <Box sx={{ height: 6, width: '70%', borderRadius: 3, bgcolor: sp.selectedBg }} />
                      <Box sx={{ height: 6, width: '85%', borderRadius: 3, bgcolor: sp.iconColor, opacity: 0.5 }} />
                      <Box sx={{ height: 6, width: '60%', borderRadius: 3, bgcolor: sp.iconColor, opacity: 0.5 }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 0.75 }} noWrap>{v.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.2, display: 'block' }}>{v.hint}</Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* Wallpaper */}
        <Card>
          <CardContent>
            <SectionTitle>Background wallpaper</SectionTitle>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={draft.wallpaper.type}
              onChange={(_, v: WallpaperType | null) => v && patchWallpaper({ type: v })}
              sx={{ mt: 1.5, flexWrap: 'wrap' }}
            >
              <ToggleButton value="none">None</ToggleButton>
              <ToggleButton value="color">Solid colour</ToggleButton>
              <ToggleButton value="gradient">Gradient</ToggleButton>
              <ToggleButton value="image">Image</ToggleButton>
            </ToggleButtonGroup>

            {draft.wallpaper.type === 'color' && (
              <Box sx={{ mt: 2 }}>
                <ColorField
                  label="Background colour"
                  value={/^#/.test(draft.wallpaper.value) ? draft.wallpaper.value : '#eef2f0'}
                  onChange={(v) => patchWallpaper({ value: v })}
                />
              </Box>
            )}

            {draft.wallpaper.type === 'gradient' && (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  mt: 2,
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                }}
              >
                {GRADIENT_PRESETS.map((g) => {
                  const active = draft.wallpaper.value === g.value;
                  return (
                    <Box
                      key={g.id}
                      onClick={() => patchWallpaper({ value: g.value })}
                      sx={{ cursor: 'pointer', textAlign: 'center' }}
                    >
                      <Box
                        sx={{
                          height: 56,
                          borderRadius: 2,
                          background: g.value,
                          border: '2px solid',
                          borderColor: active ? 'primary.main' : 'divider',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-end',
                          p: 0.5,
                        }}
                      >
                        {active && <CheckRoundedIcon sx={{ color: 'primary.main', bgcolor: 'background.paper', borderRadius: '50%', fontSize: 18 }} />}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>{g.name}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {draft.wallpaper.type === 'image' && (
              <Box sx={{ mt: 2 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Button variant="outlined" startIcon={<UploadRoundedIcon />} onClick={() => fileRef.current?.click()}>
                    {draft.wallpaper.value ? 'Replace image' : 'Upload image'}
                  </Button>
                  {draft.wallpaper.value && (
                    <>
                      <Box
                        sx={{
                          width: 96,
                          height: 56,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundImage: `url("${draft.wallpaper.value}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <Tooltip title="Remove image">
                        <IconButton onClick={() => patchWallpaper({ value: '' })}><DeleteOutlineRoundedIcon /></IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Stored inside your organization's data. Max 2 MB; landscape images work best.
                </Typography>
              </Box>
            )}

            {(draft.wallpaper.type === 'gradient' || draft.wallpaper.type === 'image') && (
              <Box sx={{ mt: 2.5, maxWidth: 360 }}>
                <Typography variant="caption" color="text.secondary">
                  Readability overlay — {Math.round(draft.wallpaper.opacity * 100)}%
                </Typography>
                <Slider
                  value={draft.wallpaper.opacity}
                  min={0}
                  max={0.9}
                  step={0.05}
                  onChange={(_, v) => patchWallpaper({ opacity: v as number })}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ position: { lg: 'sticky' }, bottom: 0 }}>
          <Button variant="contained" size="large" startIcon={<SaveRoundedIcon />} onClick={onSave} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outlined" startIcon={<UndoRoundedIcon />} onClick={onDiscard} disabled={!dirty}>
            Discard changes
          </Button>
          <Button color="inherit" startIcon={<RestartAltRoundedIcon />} onClick={onReset}>
            Reset to default
          </Button>
        </Stack>
      </Stack>

      {/* ---------- Live preview (right) ---------- */}
      <Box sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
        <Box sx={{ position: { lg: 'sticky' }, top: 16 }}>
          <Typography variant="overline" color="text.secondary">Live preview</Typography>
          <PreviewPane config={draft} />
        </Box>
      </Box>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{children}</Typography>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="input"
          type="color"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            width: 48,
            height: 40,
            p: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: 'transparent',
            cursor: 'pointer',
          }}
        />
        <TextField
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ maxLength: 9 }}
        />
      </Stack>
    </Box>
  );
}

/**
 * A self-contained mini-app rendered with the draft colours so the admin sees
 * the effect without scanning the whole screen. Uses inline colours (not the
 * MUI theme) so the swatch reflects the draft even mid-edit.
 */
function PreviewPane({ config }: { config: AppearanceConfig }) {
  const isDark = config.mode === 'dark';
  const paper = isDark ? '#1c2622' : '#ffffff';
  const bg = isDark ? '#101614' : '#f4f6f5';
  const text = isDark ? '#e8efe9' : '#1c2522';
  const sub = isDark ? '#9bb0a6' : '#5d6b66';
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#e8ebe9';
  const radius = config.borderRadius;

  const scrimRgb = isDark ? '16,22,20' : '255,255,255';
  const scrim = `linear-gradient(rgba(${scrimRgb},${config.wallpaper.opacity}), rgba(${scrimRgb},${config.wallpaper.opacity}))`;
  const wp = config.wallpaper;
  const surfaceBg =
    wp.type === 'none' || !wp.value
      ? bg
      : wp.type === 'color'
        ? wp.value
        : wp.type === 'image'
          ? `${scrim}, url("${wp.value}")`
          : `${scrim}, ${wp.value}`;

  // Sidebar swatch colours derived from the draft (same logic as the app shell).
  const sp = sidebarPalette(config.sidebar, buildTheme(config));
  const navRows = ['Dashboard', 'Sales', 'Inventory'];

  return (
    <Box
      sx={{
        mt: 0.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        boxShadow: '0 6px 20px rgba(16,24,40,0.08)',
        display: 'flex',
      }}
    >
      {/* mini sidebar */}
      <Box sx={{ width: 92, flexShrink: 0, bgcolor: sp.bg, borderRight: `1px solid ${sp.borderColor}`, p: 0.75 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, px: 0.25 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: config.primaryColor }} />
          <Typography sx={{ fontWeight: 800, fontSize: 9, color: sp.color }} noWrap>Mandi</Typography>
        </Stack>
        <Stack spacing={0.5}>
          {navRows.map((n, i) => (
            <Box
              key={n}
              sx={{
                borderRadius: 1,
                px: 0.6,
                py: 0.4,
                bgcolor: i === 0 ? sp.selectedBg : 'transparent',
              }}
            >
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: i === 0 ? sp.selectedColor : sp.color }} noWrap>{n}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* right column */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
      {/* top bar */}
      <Box sx={{ bgcolor: paper, borderBottom: `1px solid ${border}`, px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: config.primaryColor, display: 'grid', placeItems: 'center', color: '#fff' }}>
          <StorefrontRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: text }}>Mandi ERP</Typography>
      </Box>

      {/* canvas */}
      <Box
        sx={{
          p: 1.5,
          minHeight: 230,
          background: surfaceBg,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <Box sx={{ bgcolor: paper, border: `1px solid ${border}`, borderRadius: `${radius + 4}px`, p: 1.5 }}>
          <Typography sx={{ fontSize: 11, color: sub }}>Today's Sales</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 20, color: text }}>₹ 22,900</Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
            <Chip size="small" label="Paid" sx={{ bgcolor: config.primaryColor, color: '#fff', height: 22, fontWeight: 700 }} />
            <Chip size="small" label="Due" sx={{ bgcolor: config.secondaryColor, color: '#1a1a1a', height: 22, fontWeight: 700 }} />
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1,
              borderRadius: `${Math.max(8, radius - 2)}px`,
              bgcolor: config.primaryColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Primary
          </Box>
          <Box
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1,
              borderRadius: `${Math.max(8, radius - 2)}px`,
              border: `1.5px solid ${config.primaryColor}`,
              color: config.primaryColor,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Outlined
          </Box>
        </Box>

        <Typography sx={{ fontSize: 11, color: sub, mt: 'auto' }}>
          {config.mode === 'dark' ? 'Dark' : 'Light'} mode · {config.wallpaper.type} wallpaper
        </Typography>
      </Box>
      </Box>
    </Box>
  );
}
