import { useState } from 'react';
import { Typography } from '@mui/material';
import { useDeleteSupplierMutation, useGetSuppliersQuery } from '@/api/mastersApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import SupplierFormDialog from '@/components/masters/SupplierFormDialog';
import type { Supplier } from '@/types/domain';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetSuppliersQuery(search || undefined);
  const [deleteSupplier] = useDeleteSupplierMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setOpen(true);
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

      <SupplierFormDialog open={open} onClose={() => setOpen(false)} editing={editing} />
    </>
  );
}
