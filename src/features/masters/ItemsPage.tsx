import { useState } from 'react';
import {
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
import {
  useCreateItemMutation,
  useDeleteItemMutation,
  useGetItemsQuery,
  useUpdateItemMutation,
} from '@/api/mastersApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
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
  const [createItem, { isLoading: creating }] = useCreateItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(blankForm);

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
              <Typography variant="caption" color="text.secondary">
                Comm {item.defaultCommissionPct}% · Fee {item.defaultMarketFeePct}%
              </Typography>
            }
            onEdit={() => openEdit(item)}
            onArchive={item.isActive ? () => deleteItem(item.id) : undefined}
          />
        )}
      />

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
