import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useCreateCustomerMutation, useUpdateCustomerMutation } from '@/api/mastersApi';
import type { Customer } from '@/types/domain';

const blankForm = {
  name: '',
  mobile: '',
  area: '',
  gstNumber: '',
  creditLimit: 0,
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass a customer to edit; omit/null to add a new one. */
  editing?: Customer | null;
  /** Prefill the name (e.g. from what the user typed in a search box). */
  initialName?: string;
  /** Called with the saved customer after a successful create/update. */
  onSaved?: (customer: Customer) => void;
}

/**
 * Add/edit-customer dialog, reused by the Customers master page and inline from
 * the Sale Entry screen (so a customer can be created without leaving the flow).
 */
export default function CustomerFormDialog({ open, onClose, editing, initialName, onSaved }: Props) {
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();
  const [form, setForm] = useState(blankForm);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            name: editing.name,
            mobile: editing.mobile ?? '',
            area: editing.area ?? '',
            gstNumber: editing.gstNumber ?? '',
            creditLimit: editing.creditLimit,
          }
        : { ...blankForm, name: initialName ?? '' },
    );
  }, [open, editing, initialName]);

  const save = async () => {
    const saved = editing
      ? await updateCustomer({ id: editing.id, body: form }).unwrap()
      : await createCustomer(form).unwrap();
    onSaved?.(saved);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
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
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!form.name.trim() || creating || updating}>
          {editing ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
