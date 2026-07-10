import { useState } from 'react';
import { Typography } from '@mui/material';
import { useDeleteCustomerMutation, useGetCustomersQuery } from '@/api/mastersApi';
import MasterList from '@/components/common/MasterList';
import EntityCard from '@/components/common/EntityCard';
import CustomerFormDialog from '@/components/masters/CustomerFormDialog';
import { formatCurrency } from '@/utils/format';
import type { Customer } from '@/types/domain';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetCustomersQuery(search || undefined);
  const [deleteCustomer] = useDeleteCustomerMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setOpen(true);
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

      <CustomerFormDialog open={open} onClose={() => setOpen(false)} editing={editing} />
    </>
  );
}
