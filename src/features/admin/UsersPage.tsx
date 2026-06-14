import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import {
  useCreateUserMutation,
  useGetBranchesQuery,
  useGetUsersQuery,
  useResetUserPasswordMutation,
  useUpdateUserMutation,
} from '@/api/adminApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import { ORG_ROLE_INFO } from '@/config/roles';
import type { ManagedUser } from '@/types/finance';

const ROLES: { value: string; label: string }[] = [
  { value: 'org_admin', label: 'Organization Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'sales_operator', label: 'Sales Operator' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'collection_executive', label: 'Collection Executive' },
  { value: 'purchase_operator', label: 'Purchase Operator' },
  { value: 'auditor', label: 'Auditor' },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useGetUsersQuery();
  const { data: branches } = useGetBranchesQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: resetting }] = useResetUserPasswordMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'sales_operator', branchId: '', mobile: '' });
  const [error, setError] = useState<string | null>(null);

  const [resetFor, setResetFor] = useState<ManagedUser | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetDone, setResetDone] = useState<string | null>(null);

  const filtered = (users ?? []).filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => { setEditing(null); setError(null); setForm({ name: '', username: '', password: '', role: 'sales_operator', branchId: branches?.[0]?.id ?? '', mobile: '' }); setOpen(true); };
  const openEdit = (u: ManagedUser) => { setEditing(u); setError(null); setForm({ name: u.name, username: u.username, password: '', role: u.role, branchId: u.branchId ?? '', mobile: u.mobile ?? '' }); setOpen(true); };

  const save = async () => {
    setError(null);
    try {
      if (editing) {
        await updateUser({ id: editing.id, body: { name: form.name, role: form.role, branchId: form.branchId || null, mobile: form.mobile || undefined } }).unwrap();
      } else {
        await createUser({ name: form.name, username: form.username, password: form.password, role: form.role, branchId: form.branchId || undefined, mobile: form.mobile || undefined }).unwrap();
      }
      setOpen(false);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save user.');
    }
  };

  const toggleActive = (u: ManagedUser) => updateUser({ id: u.id, body: { isActive: !u.isActive } });

  const doReset = async () => {
    if (!resetFor) return;
    await resetPassword({ id: resetFor.id, newPassword: resetPw }).unwrap();
    setResetDone(`Password reset for ${resetFor.name}. They must change it on next login.`);
    setResetFor(null);
    setResetPw('');
  };

  return (
    <>
      <MasterList<ManagedUser>
        title="Users"
        addLabel="Add User"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name or username…"
        items={filtered}
        loading={isLoading}
        getKey={(u) => u.id}
        onAdd={openAdd}
        emptyText="No users yet."
        renderItem={(u) => (
          <EntityCard
            avatarText={u.name.charAt(0)}
            title={u.name}
            subtitle={`@${u.username} · ${roleLabel(u.role)}`}
            inactive={!u.isActive}
            chips={u.isActive ? [{ label: 'Active', color: 'success' }] : [{ label: 'Disabled', color: 'default' }]}
            onEdit={() => openEdit(u)}
            onArchive={u.isActive ? () => toggleActive(u) : undefined}
          />
        )}
      />

      {resetDone && (
        <Alert severity="success" onClose={() => setResetDone(null)} sx={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 1300 }}>
          {resetDone}
        </Alert>
      )}

      {/* Add / edit user */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <TextField
              label="Username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() })}
              disabled={Boolean(editing)}
              helperText={editing ? 'Username cannot be changed' : 'Used to log in (min 3 chars)'}
            />
            {!editing && (
              <TextField label="Temporary password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText="Min 6 chars. User must change it on first login." />
            )}
            <TextField
              select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              helperText={ORG_ROLE_INFO.find((r) => r.value === form.role)?.summary ?? 'See Roles & Access for details'}
            >
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <TextField select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <MenuItem value="">— None —</MenuItem>
              {(branches ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
            <TextField label="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            {error && <Alert severity="error">{error}</Alert>}
            {editing && (
              <Button startIcon={<LockResetRoundedIcon />} variant="outlined" color="warning" onClick={() => { setResetFor(editing); setResetPw(''); setOpen(false); }}>
                Reset password
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.name.trim() || (!editing && (form.username.length < 3 || form.password.length < 6)) || creating || updating}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset password */}
      <Dialog open={Boolean(resetFor)} onClose={() => setResetFor(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Reset password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Set a new temporary password for <strong>{resetFor?.name}</strong>. They'll be asked to change it at next login.</Typography>
            <TextField label="New temporary password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} autoFocus helperText="Min 6 characters" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResetFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={doReset} disabled={resetPw.length < 6 || resetting}>Reset</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
