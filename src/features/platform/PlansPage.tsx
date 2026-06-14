import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import {
  useCreatePlanMutation,
  useGetFeatureCatalogueQuery,
  useGetPlansQuery,
  useUpdatePlanMutation,
} from '@/api/platformApi';
import type { PlatformFeature } from '@/types';
import type { SubscriptionPlan } from '@/types/platform';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

type FormState = {
  name: string; code: string; description: string;
  priceMonthly: string; priceYearly: string; maxUsers: string; maxBranches: string;
  features: PlatformFeature[]; isDefault: boolean; isPublic: boolean; isActive: boolean; sortOrder: string;
};

const emptyForm: FormState = {
  name: '', code: '', description: '', priceMonthly: '0', priceYearly: '0',
  maxUsers: '', maxBranches: '', features: [], isDefault: false, isPublic: true, isActive: true, sortOrder: '0',
};

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string | string[] } })?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg ?? fallback;
}

export default function PlansPage() {
  const { data: plans, isLoading } = useGetPlansQuery();
  const { data: catalogue } = useGetFeatureCatalogueQuery();
  const [createPlan, { isLoading: creating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: updating }] = useUpdatePlanMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setError(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p); setError(null);
    setForm({
      name: p.name, code: p.code, description: p.description ?? '',
      priceMonthly: String(p.priceMonthly), priceYearly: String(p.priceYearly),
      maxUsers: p.maxUsers?.toString() ?? '', maxBranches: p.maxBranches?.toString() ?? '',
      features: p.features, isDefault: p.isDefault, isPublic: p.isPublic, isActive: p.isActive, sortOrder: String(p.sortOrder),
    });
    setOpen(true);
  };

  const toggleFeature = (key: PlatformFeature) =>
    setForm((f) => ({ ...f, features: f.features.includes(key) ? f.features.filter((x) => x !== key) : [...f.features, key] }));

  const save = async () => {
    setError(null);
    const body = {
      name: form.name.trim(), code: form.code.trim(), description: form.description.trim() || undefined,
      priceMonthly: Number(form.priceMonthly) || 0, priceYearly: Number(form.priceYearly) || 0,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
      maxBranches: form.maxBranches ? Number(form.maxBranches) : null,
      features: form.features, isDefault: form.isDefault, isPublic: form.isPublic, isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) await updatePlan({ id: editing.id, body }).unwrap();
      else await createPlan(body).unwrap();
      setToast(editing ? 'Plan updated' : 'Plan created');
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e, 'Could not save plan.'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center">
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Plans & Pricing</Typography>
          <Typography variant="body2" color="text.secondary">Define subscription tiers and the features each unlocks.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd}>New plan</Button>
      </Stack>

      {isLoading && <LinearProgress />}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {(plans ?? []).map((p) => (
          <Card key={p.id} sx={{ flex: '1 1 280px', minWidth: 260, opacity: p.isActive ? 1 : 0.6 }}>
            <CardContent>
              <Stack direction="row" alignItems="flex-start">
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{p.name}</Typography>
                    {p.isDefault && <Chip size="small" color="primary" label="Default" />}
                    {!p.isActive && <Chip size="small" label="Inactive" />}
                    {!p.isPublic && <Chip size="small" variant="outlined" label="Private" />}
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {inr(p.priceMonthly)}<Typography component="span" variant="caption" color="text.secondary"> /mo</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{inr(p.priceYearly)} /yr</Typography>
                </Box>
                <IconButton onClick={() => openEdit(p)} aria-label="edit"><EditRoundedIcon /></IconButton>
              </Stack>
              {p.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{p.description}</Typography>}
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                {p.maxUsers ? `${p.maxUsers} users` : 'Unlimited users'} · {p.maxBranches ? `${p.maxBranches} branches` : 'Unlimited branches'}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {p.features.length === 0 && <Typography variant="caption" color="text.secondary">Core modules only</Typography>}
                {p.features.map((f) => <Chip key={f} size="small" variant="outlined" label={f} sx={{ textTransform: 'capitalize' }} />)}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Plan' : 'New Plan'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth autoFocus />
              <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} fullWidth disabled={Boolean(editing)} helperText={editing ? 'Cannot change' : 'lowercase-id'} />
            </Stack>
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline minRows={2} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Price / month (₹)" type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} fullWidth />
              <TextField label="Price / year (₹)" type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: e.target.value })} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Max users" type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} fullWidth helperText="Blank = unlimited" />
              <TextField label="Max branches" type="number" value={form.maxBranches} onChange={(e) => setForm({ ...form, maxBranches: e.target.value })} fullWidth helperText="Blank = unlimited" />
              <TextField label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} fullWidth />
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Included features</Typography>
              <Typography variant="caption" color="text.secondary">Core modules (sales, arrivals, inventory, collections, billing, masters) are always included.</Typography>
              <FormGroup>
                {(catalogue ?? []).map((c) => (
                  <FormControlLabel
                    key={c.key}
                    control={<Checkbox checked={form.features.includes(c.key)} onChange={() => toggleFeature(c.key)} />}
                    label={<Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.label}</Typography><Typography variant="caption" color="text.secondary">{c.description}</Typography></Box>}
                  />
                ))}
              </FormGroup>
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel control={<Checkbox checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="Active" />
              <FormControlLabel control={<Checkbox checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />} label="Public (shown at signup)" />
              <FormControlLabel control={<Checkbox checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />} label="Default for new orgs" />
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.name.trim() || form.code.length < 2 || creating || updating}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
