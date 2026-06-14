import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  useGetPlansQuery,
  useGetPlatformOrgQuery,
  useGetPlatformOrgsQuery,
  useUpdatePlatformOrgMutation,
} from '@/api/platformApi';
import type { SubscriptionStatus } from '@/types';

const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'default' | 'error'> = {
  active: 'success', trial: 'info', suspended: 'warning', expired: 'error', cancelled: 'default',
};
const STATUSES: SubscriptionStatus[] = ['trial', 'active', 'suspended', 'expired', 'cancelled'];

function OrgDetailDialog({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const { data: org, isLoading } = useGetPlatformOrgQuery(id);
  const { data: plans } = useGetPlansQuery();
  const [update, { isLoading: saving }] = useUpdatePlatformOrgMutation();

  const [form, setForm] = useState({ planId: '', subscriptionStatus: 'trial' as SubscriptionStatus, billingCycle: 'monthly', renewalDate: '', isActive: true });

  useEffect(() => {
    if (org) setForm({
      planId: org.planId ?? '',
      subscriptionStatus: org.subscriptionStatus,
      billingCycle: org.billingCycle,
      renewalDate: org.renewalDate ?? '',
      isActive: org.isActive,
    });
  }, [org]);

  const save = async () => {
    await update({ id, body: {
      planId: form.planId || null,
      subscriptionStatus: form.subscriptionStatus,
      billingCycle: form.billingCycle as 'monthly' | 'yearly',
      renewalDate: form.renewalDate || null,
      isActive: form.isActive,
    } }).unwrap();
    onSaved('Subscription updated');
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{org?.name ?? 'Organization'}</DialogTitle>
      <DialogContent dividers>
        {isLoading || !org ? <LinearProgress /> : (
          <Stack spacing={2}>
            {!org.isActive && <Alert severity="warning">This organization is suspended — its users cannot sign in.</Alert>}
            <Box>
              <Typography variant="caption" color="text.secondary">Primary admin</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {org.primaryAdmin ? `${org.primaryAdmin.name} (@${org.primaryAdmin.username})` : '—'}
              </Typography>
              {org.email && <Typography variant="caption" color="text.secondary">{org.email}</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Usage</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(org.usage).map(([k, v]) => (
                  <Chip key={k} size="small" variant="outlined" label={`${k}: ${v}`} sx={{ textTransform: 'capitalize' }} />
                ))}
              </Stack>
            </Box>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Subscription</Typography>
            <TextField select label="Plan" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
              <MenuItem value="">— No plan —</MenuItem>
              {(plans ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}{!p.isActive ? ' (inactive)' : ''}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Status" value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value as SubscriptionStatus })} fullWidth>
                {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Billing cycle" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} fullWidth>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </TextField>
            </Stack>
            <TextField label="Renewal date" type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label={form.isActive ? 'Organization active' : 'Organization suspended'}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={save} disabled={saving || isLoading}>Save changes</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OrganizationsPage() {
  const { data: orgs, isLoading } = useGetPlatformOrgsQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = (orgs ?? []).filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Organizations</Typography>
        <Typography variant="body2" color="text.secondary">Manage tenants, plans and subscription status.</Typography>
      </Box>
      <TextField size="small" placeholder="Search organizations…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: 360 }} />

      {isLoading && <LinearProgress />}
      <Stack spacing={1}>
        {filtered.map((o) => (
          <Card key={o.id} variant="outlined">
            <CardActionArea onClick={() => setSelected(o.id)}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Box sx={{ flexGrow: 1, minWidth: 160 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{o.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.userCount} users · {o.branchCount} branches{o.renewalDate ? ` · renews ${o.renewalDate}` : ''}
                    </Typography>
                  </Box>
                  <Chip size="small" label={o.planName ?? 'No plan'} variant="outlined" sx={{ fontWeight: 600 }} />
                  <Chip size="small" color={STATUS_COLORS[o.subscriptionStatus] ?? 'default'} label={o.subscriptionStatus} sx={{ textTransform: 'capitalize' }} />
                  {!o.isActive && <Chip size="small" color="error" label="Suspended" />}
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && <Typography variant="body2" color="text.secondary">No organizations found.</Typography>}
      </Stack>

      {selected && <OrgDetailDialog id={selected} onClose={() => setSelected(null)} onSaved={setToast} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
