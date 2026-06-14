import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import WallpaperRoundedIcon from '@mui/icons-material/WallpaperRounded';
import { useGetBrandingQuery, useUpdateBrandingMutation } from '@/api/platformApi';
import { DEFAULT_BRANDING, LOGIN_BG_PRESETS, type PlatformBranding } from '@/types/appearance';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

type BgType = PlatformBranding['background']['type'];

export default function BrandingPage() {
  const { data: saved } = useGetBrandingQuery();
  const [save, { isLoading: saving }] = useUpdateBrandingMutation();

  const [draft, setDraft] = useState<PlatformBranding>(saved ?? DEFAULT_BRANDING);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync the editor once the saved branding loads (and after a save).
  useEffect(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  const baseline = saved ?? DEFAULT_BRANDING;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  const patch = (p: Partial<PlatformBranding>) => setDraft((d) => ({ ...d, ...p }));
  const patchBg = (p: Partial<PlatformBranding['background']>) =>
    setDraft((d) => ({ ...d, background: { ...d.background, ...p } }));

  const onSave = async () => {
    setError(null);
    try {
      await save(draft).unwrap();
      setToast('Login screen branding saved');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save branding.');
    }
  };

  const onPickImage = (file?: File | null) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 3 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patchBg({ type: 'image', value: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Controls ---- */}
      <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WallpaperRoundedIcon color="primary" /> Login &amp; Branding
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Controls the public sign-in / register screens for every organization. Changes apply after you save.
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Identity */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Identity</Typography>
            <Stack spacing={2}>
              <TextField label="App name" value={draft.appName} onChange={(e) => patch({ appName: e.target.value })} inputProps={{ maxLength: 60 }} />
              <TextField label="Tagline" value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} inputProps={{ maxLength: 120 }} />
              <ColorField label="Brand colour (buttons & links)" value={draft.primaryColor} onChange={(v) => patch({ primaryColor: v })} />
            </Stack>
          </CardContent>
        </Card>

        {/* Background */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Background</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={draft.background.type}
              onChange={(_, v: BgType | null) => v && patchBg({ type: v })}
              sx={{ mt: 1.5 }}
            >
              <ToggleButton value="gradient">Gradient</ToggleButton>
              <ToggleButton value="color">Solid colour</ToggleButton>
              <ToggleButton value="image">Image</ToggleButton>
            </ToggleButtonGroup>

            {draft.background.type === 'gradient' && (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  mt: 2,
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                }}
              >
                {LOGIN_BG_PRESETS.map((g) => {
                  const active = draft.background.value === g.value;
                  return (
                    <Box key={g.id} onClick={() => patchBg({ value: g.value })} sx={{ cursor: 'pointer', textAlign: 'center' }}>
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
                        {active && <CheckRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>{g.name}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {draft.background.type === 'color' && (
              <Box sx={{ mt: 2 }}>
                <ColorField
                  label="Background colour"
                  value={/^#/.test(draft.background.value) ? draft.background.value : '#13652f'}
                  onChange={(v) => patchBg({ value: v })}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Use a dark shade — the title and tagline are shown in white.
                </Typography>
              </Box>
            )}

            {draft.background.type === 'image' && (
              <Box sx={{ mt: 2 }}>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPickImage(e.target.files?.[0])} />
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Button variant="outlined" startIcon={<UploadRoundedIcon />} onClick={() => fileRef.current?.click()}>
                    {draft.background.type === 'image' && draft.background.value.startsWith('data:') ? 'Replace image' : 'Upload image'}
                  </Button>
                  {draft.background.value.startsWith('data:') && (
                    <>
                      <Box
                        sx={{
                          width: 96,
                          height: 56,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundImage: `url("${draft.background.value}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <Tooltip title="Remove image">
                        <IconButton onClick={() => patchBg({ type: 'gradient', value: DEFAULT_BRANDING.background.value })}>
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Full-screen cover image. Max 3 MB; a darker photo keeps the white text readable.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button variant="contained" size="large" startIcon={<SaveRoundedIcon />} onClick={onSave} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button color="inherit" startIcon={<RestartAltRoundedIcon />} onClick={() => setDraft(DEFAULT_BRANDING)}>
            Reset to default
          </Button>
        </Stack>
      </Stack>

      {/* ---- Live preview ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
        <Box sx={{ position: { lg: 'sticky' }, top: 16 }}>
          <Typography variant="overline" color="text.secondary">Login screen preview</Typography>
          <LoginPreview branding={draft} />
        </Box>
      </Box>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="input"
          type="color"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{ width: 48, height: 40, p: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'transparent', cursor: 'pointer' }}
        />
        <TextField size="small" value={value} onChange={(e) => onChange(e.target.value)} inputProps={{ maxLength: 9 }} sx={{ maxWidth: 160 }} />
      </Stack>
    </Box>
  );
}

/** Miniature of the actual login screen using the draft branding. */
function LoginPreview({ branding }: { branding: PlatformBranding }) {
  const bg = branding.background;
  const bgSx =
    bg.type === 'image'
      ? { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: bg.value };

  return (
    <Box
      sx={{
        mt: 0.5,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 6px 20px rgba(16,24,40,0.12)',
        p: 2,
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...bgSx,
      }}
    >
      <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', color: '#fff', mb: 1 }}>
        <StorefrontRoundedIcon />
      </Box>
      <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 22, textAlign: 'center' }}>{branding.appName || 'App name'}</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', mb: 2 }}>{branding.tagline}</Typography>

      <Box sx={{ width: '100%', maxWidth: 240, bgcolor: '#fff', borderRadius: 3, p: 1.5, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Sign in</Typography>
        <Box sx={{ height: 30, borderRadius: 1.5, border: '1px solid #e0e0e0', mt: 1 }} />
        <Box sx={{ height: 30, borderRadius: 1.5, border: '1px solid #e0e0e0', mt: 1 }} />
        <Box sx={{ height: 34, borderRadius: 1.5, bgcolor: branding.primaryColor, mt: 1.25, display: 'grid', placeItems: 'center' }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>Sign in</Typography>
        </Box>
        <Typography sx={{ color: branding.primaryColor, fontWeight: 700, fontSize: 11, textAlign: 'center', mt: 1 }}>Forgot password?</Typography>
      </Box>
    </Box>
  );
}
