import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  useCreateBranchMutation,
  useGetBranchesQuery,
  useGetOrganizationQuery,
  useUpdateBranchMutation,
  useUpdateOrganizationMutation,
} from '@/api/adminApi';
import EntityCard from '@/components/common/EntityCard';
import type { Branch } from '@/types/finance';

export default function OrganizationPage() {
  const { data: org } = useGetOrganizationQuery();
  const [updateOrg, { isLoading: savingOrg }] = useUpdateOrganizationMutation();
  const { data: branches } = useGetBranchesQuery();
  const [createBranch] = useCreateBranchMutation();
  const [updateBranch] = useUpdateBranchMutation();

  const [form, setForm] = useState({ name: '', gstNumber: '', address: '', mobile: '', email: '' });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (org) setForm({ name: org.name ?? '', gstNumber: org.gstNumber ?? '', address: org.address ?? '', mobile: org.mobile ?? '', email: org.email ?? '' });
  }, [org]);

  const [branchDialog, setBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({ name: '', location: '', contactDetails: '' });

  const saveOrg = async () => {
    await updateOrg(form).unwrap();
    setToast('Organization updated');
  };

  const openAddBranch = () => { setEditingBranch(null); setBranchForm({ name: '', location: '', contactDetails: '' }); setBranchDialog(true); };
  const openEditBranch = (b: Branch) => { setEditingBranch(b); setBranchForm({ name: b.name, location: b.location ?? '', contactDetails: b.contactDetails ?? '' }); setBranchDialog(true); };
  const saveBranch = async () => {
    if (editingBranch) await updateBranch({ id: editingBranch.id, body: branchForm }).unwrap();
    else await createBranch(branchForm).unwrap();
    setBranchDialog(false);
    setToast('Branch saved');
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Organization</Typography>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Organization name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="GST number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
              <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </Stack>
            <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline minRows={2} />
            <Button variant="contained" onClick={saveOrg} disabled={savingOrg}>Save organization</Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>Branches</Typography>
        <Button startIcon={<AddRoundedIcon />} onClick={openAddBranch}>Add branch</Button>
      </Box>
      <Stack spacing={1}>
        {(branches ?? []).map((b) => (
          <EntityCard
            key={b.id}
            avatarText={b.name.charAt(0)}
            title={b.name}
            subtitle={[b.location, b.contactDetails].filter(Boolean).join(' · ')}
            inactive={!b.isActive}
            onEdit={() => openEditBranch(b)}
          />
        ))}
      </Stack>

      <Dialog open={branchDialog} onClose={() => setBranchDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} autoFocus />
            <TextField label="Location" value={branchForm.location} onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })} />
            <TextField label="Contact details" value={branchForm.contactDetails} onChange={(e) => setBranchForm({ ...branchForm, contactDetails: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBranchDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveBranch} disabled={!branchForm.name.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
