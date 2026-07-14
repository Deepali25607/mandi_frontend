import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import {
  useCreateBankAccountMutation,
  useDeleteBankAccountMutation,
  useGetBankAccountsQuery,
  useUpdateBankAccountMutation,
} from '@/api/financeApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import { formatCurrency } from '@/utils/format';
import type { BankAccount } from '@/types/finance';

const emptyForm = { name: '', bankName: '', accountNumber: '', openingBalance: '' };

export default function BankAccountsPage() {
  const [search, setSearch] = useState('');
  const { data: accounts, isLoading } = useGetBankAccountsQuery();
  const [createAccount, { isLoading: creating }] = useCreateBankAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateBankAccountMutation();
  const [deleteAccount] = useDeleteBankAccountMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const filtered = (accounts ?? []).filter(
    (a) => !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.bankName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => { setEditing(null); setError(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (a: BankAccount) => {
    setEditing(a);
    setError(null);
    setForm({ name: a.name, bankName: a.bankName ?? '', accountNumber: a.accountNumber ?? '', openingBalance: String(a.openingBalance ?? '') });
    setOpen(true);
  };

  const save = async () => {
    setError(null);
    const body = {
      name: form.name.trim(),
      bankName: form.bankName.trim() || undefined,
      accountNumber: form.accountNumber.trim() || undefined,
      openingBalance: form.openingBalance === '' ? 0 : Number(form.openingBalance),
    };
    try {
      if (editing) await updateAccount({ id: editing.id, body }).unwrap();
      else await createAccount(body).unwrap();
      setOpen(false);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save the bank account.');
    }
  };

  const toggleActive = (a: BankAccount) => updateAccount({ id: a.id, body: { isActive: !a.isActive } });
  const remove = async (a: BankAccount) => {
    try { await deleteAccount(a.id).unwrap(); }
    catch (e) {
      const msg = (e as { data?: { message?: string } })?.data?.message;
      setError(msg ?? 'Could not delete the bank account.');
    }
  };

  return (
    <>
      <MasterList<BankAccount>
        title="Bank Accounts"
        addLabel="Add Bank Account"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name or bank…"
        items={filtered}
        loading={isLoading}
        getKey={(a) => a.id}
        onAdd={openAdd}
        emptyText="No bank accounts yet. Add one to route UPI / bank receipts here."
        renderItem={(a) => (
          <EntityCard
            avatarText={a.name.charAt(0)}
            title={a.name}
            subtitle={[a.bankName, a.accountNumber ? `A/C ${a.accountNumber}` : null, `Opening ${formatCurrency(a.openingBalance ?? 0, false)}`].filter(Boolean).join(' · ')}
            inactive={!a.isActive}
            chips={a.isActive ? [{ label: 'Active', color: 'success' }] : [{ label: 'Disabled', color: 'default' }]}
            onEdit={() => openEdit(a)}
            onArchive={a.isActive ? () => toggleActive(a) : undefined}
            onDelete={() => remove(a)}
          />
        )}
      />

      {error && !open && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 1300 }}>
          {error}
        </Alert>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Account name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus helperText="A label you'll recognise, e.g. “HDFC Current” or “Owner UPI”." />
            <TextField label="Bank name (optional)" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <TextField label="Account number (optional)" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            <TextField label="Opening balance ₹" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} inputProps={{ inputMode: 'decimal' }} helperText="Balance already in this account before using the app." />
            {error && <Alert severity="error">{error}</Alert>}
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
