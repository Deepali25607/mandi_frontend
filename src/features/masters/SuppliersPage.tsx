import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from '@/api/mastersApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import type { Supplier } from '@/types/domain';

const blankForm = {
  name: '',
  village: '',
  mobile: '',
  commissionRate: 6,
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
};

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetSuppliersQuery(search || undefined);
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(blankForm);

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm);
    setOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      village: s.village ?? '',
      mobile: s.mobile ?? '',
      commissionRate: s.commissionRate,
      bankName: s.bankName ?? '',
      bankAccount: s.bankAccount ?? '',
      bankIfsc: s.bankIfsc ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (editing) await updateSupplier({ id: editing.id, body: form }).unwrap();
    else await createSupplier(form).unwrap();
    setOpen(false);
  };

  return (
    <>
      <MasterList<Supplier>
        title="Suppliers"
        addLabel="Add Supplier"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name, code or village…"
        items={data}
        loading={isLoading}
        getKey={(s) => s.id}
        onAdd={openAdd}
        emptyText="No suppliers yet. Add your first supplier."
        renderItem={(s) => (
          <EntityCard
            avatarText={s.name.charAt(0)}
            title={s.name}
            subtitle={[s.code, s.village, s.mobile].filter(Boolean).join(' · ')}
            inactive={!s.isActive}
            chips={s.isActive ? [] : [{ label: 'Archived', color: 'default' }]}
            meta={
              <Typography variant="caption" color="text.secondary">
                Comm {s.commissionRate}%
              </Typography>
            }
            onEdit={() => openEdit(s)}
            onArchive={s.isActive ? () => deleteSupplier(s.id) : undefined}
          />
        )}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <Stack direction="row" spacing={2}>
              <TextField label="Village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} inputProps={{ inputMode: 'numeric' }} />
            </Stack>
            <TextField label="Commission %" type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} />
            <Typography variant="caption" color="text.secondary">Bank details (optional)</Typography>
            <TextField label="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField label="Account no." value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
              <TextField label="IFSC" value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.name.trim() || creating || updating}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
