import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  useCreateItemMutation,
  useDeleteItemMutation,
  useDeleteItemPermanentlyMutation,
  useGetItemsQuery,
  useGetLatestPricesQuery,
  useUpdateItemMutation,
} from '@/api/mastersApi';
import { formatCurrency } from '@/utils/format';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import { useAppSelector } from '@/store/hooks';
import type { Item, ItemCategory } from '@/types/domain';

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'flowers', label: 'Flowers' },
  { value: 'grocery', label: 'Grocery' },
];

const CATEGORY_COLOR: Record<ItemCategory, 'success' | 'warning' | 'secondary' | 'info'> = {
  vegetables: 'success',
  fruits: 'warning',
  flowers: 'secondary',
  grocery: 'info',
};

const blankForm = {
  name: '',
  category: 'vegetables' as ItemCategory,
  unit: 'kg',
  defaultCommissionPct: 6,
  defaultMarketFeePct: 1,
};

export default function ItemsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetItemsQuery(search || undefined);
  const { data: latestPrices } = useGetLatestPricesQuery();
  const priceOf = (itemId: string) => latestPrices?.find((p) => p.itemId === itemId)?.price;
  const [createItem, { isLoading: creating }] = useCreateItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [deleteItemPermanently, { isLoading: deleting }] = useDeleteItemPermanentlyMutation();
  const isAdmin = useAppSelector((s) => s.auth.user?.role) === 'org_admin';

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(blankForm);
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteItemPermanently(confirmDelete.id).unwrap();
      setToast({ severity: 'success', text: `"${confirmDelete.name}" deleted permanently.` });
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setToast({ severity: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not delete the item.' });
    }
    setConfirmDelete(null);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm);
    setOpen(true);
  };
  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      defaultCommissionPct: item.defaultCommissionPct,
      defaultMarketFeePct: item.defaultMarketFeePct,
    });
    setOpen(true);
  };

  const save = async () => {
    if (editing) await updateItem({ id: editing.id, body: form }).unwrap();
    else await createItem(form).unwrap();
    setOpen(false);
  };

  return (
    <>
      <MasterList<Item>
        title="Items"
        addLabel="Add Item"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search items by name or code…"
        items={data}
        loading={isLoading}
        getKey={(i) => i.id}
        onAdd={openAdd}
        emptyText="No items yet. Add your first item."
        renderItem={(item) => (
          <EntityCard
            avatarText={item.name.charAt(0)}
            title={item.name}
            subtitle={`${item.code} · ${item.unit}`}
            inactive={!item.isActive}
            chips={[
              { label: CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category, color: CATEGORY_COLOR[item.category] },
              ...(item.isActive ? [] : [{ label: 'Archived' as const, color: 'default' as const }]),
            ]}
            meta={
              <>
                {priceOf(item.id) !== undefined && (
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {formatCurrency(priceOf(item.id)!, false)}/{item.unit}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Comm {item.defaultCommissionPct}% · Fee {item.defaultMarketFeePct}%
                </Typography>
              </>
            }
            onEdit={() => openEdit(item)}
            onArchive={item.isActive ? () => deleteItem(item.id) : undefined}
            onDelete={isAdmin ? () => setConfirmDelete(item) : undefined}
          />
        )}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete item "{confirmDelete?.name}"?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently removes the item from the master. It is only possible while the item has
            no arrivals, sales or stock history — otherwise archive it instead. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'success'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast?.text}
        </Alert>
      </Snackbar>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Item name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <TextField
              select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ItemCategory })}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Commission %"
                type="number"
                value={form.defaultCommissionPct}
                onChange={(e) => setForm({ ...form, defaultCommissionPct: Number(e.target.value) })}
              />
              <TextField
                label="Market fee %"
                type="number"
                value={form.defaultMarketFeePct}
                onChange={(e) => setForm({ ...form, defaultMarketFeePct: Number(e.target.value) })}
              />
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
