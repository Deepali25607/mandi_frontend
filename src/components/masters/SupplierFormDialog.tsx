import { useEffect, useState } from 'react';
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
import { useCreateSupplierMutation, useUpdateSupplierMutation } from '@/api/mastersApi';
import type { Supplier } from '@/types/domain';

const blankForm = {
  name: '',
  village: '',
  mobile: '',
  commissionRate: 6,
  openingBalance: 0,
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass a supplier to edit; omit/null to add a new one. */
  editing?: Supplier | null;
  /** Prefill the name (e.g. from what the user typed in a search box). */
  initialName?: string;
  /** Called with the saved supplier after a successful create/update. */
  onSaved?: (supplier: Supplier) => void;
}

/**
 * Add/edit-supplier dialog, reused by the Suppliers master page and inline from
 * the Arrival (purchase) Entry screen (so a supplier can be created without
 * leaving the flow).
 */
export default function SupplierFormDialog({ open, onClose, editing, initialName, onSaved }: Props) {
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation();
  const [form, setForm] = useState(blankForm);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            name: editing.name,
            village: editing.village ?? '',
            mobile: editing.mobile ?? '',
            commissionRate: editing.commissionRate,
            openingBalance: editing.openingBalance ?? 0,
            bankName: editing.bankName ?? '',
            bankAccount: editing.bankAccount ?? '',
            bankIfsc: editing.bankIfsc ?? '',
          }
        : { ...blankForm, name: initialName ?? '' },
    );
  }, [open, editing, initialName]);

  const save = async () => {
    const saved = editing
      ? await updateSupplier({ id: editing.id, body: form }).unwrap()
      : await createSupplier(form).unwrap();
    onSaved?.(saved);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <Stack direction="row" spacing={2}>
            <TextField label="Village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
            <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} inputProps={{ inputMode: 'numeric' }} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Commission %" type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} />
            <TextField
              label="Opening balance (₹)"
              type="number"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
              helperText="Amount already owed to supplier"
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">Bank details (optional)</Typography>
          <TextField label="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          <Stack direction="row" spacing={2}>
            <TextField label="Account no." value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
            <TextField label="IFSC" value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} />
          </Stack>
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
