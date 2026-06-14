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
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
} from '@/api/mastersApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import { formatCurrency } from '@/utils/format';
import type { Customer } from '@/types/domain';

const blankForm = {
  name: '',
  mobile: '',
  area: '',
  gstNumber: '',
  creditLimit: 0,
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetCustomersQuery(search || undefined);
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(blankForm);

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm);
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      mobile: c.mobile ?? '',
      area: c.area ?? '',
      gstNumber: c.gstNumber ?? '',
      creditLimit: c.creditLimit,
    });
    setOpen(true);
  };

  const save = async () => {
    if (editing) await updateCustomer({ id: editing.id, body: form }).unwrap();
    else await createCustomer(form).unwrap();
    setOpen(false);
  };

  return (
    <>
      <MasterList<Customer>
        title="Customers"
        addLabel="Add Customer"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name, code or area…"
        items={data}
        loading={isLoading}
        getKey={(c) => c.id}
        onAdd={openAdd}
        emptyText="No customers yet. Add your first customer."
        renderItem={(c) => (
          <EntityCard
            avatarText={c.name.charAt(0)}
            title={c.name}
            subtitle={[c.code, c.area, c.mobile].filter(Boolean).join(' · ')}
            inactive={!c.isActive}
            chips={c.isActive ? [] : [{ label: 'Archived', color: 'default' }]}
            meta={
              c.creditLimit > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Limit {formatCurrency(c.creditLimit)}
                </Typography>
              ) : undefined
            }
            onEdit={() => openEdit(c)}
            onArchive={c.isActive ? () => deleteCustomer(c.id) : undefined}
          />
        )}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <Stack direction="row" spacing={2}>
              <TextField label="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} inputProps={{ inputMode: 'numeric' }} />
            </Stack>
            <TextField label="GST number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
            <TextField label="Credit limit (₹)" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
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
