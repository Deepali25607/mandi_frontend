import { useMemo } from 'react';
import { useGetCustomersQuery, useGetItemsQuery, useGetSuppliersQuery } from '@/api/mastersApi';

/** Convenience hook: id → name resolvers for the common masters. */
export function useLookups() {
  const { data: customers } = useGetCustomersQuery();
  const { data: suppliers } = useGetSuppliersQuery();
  const { data: items } = useGetItemsQuery();

  return useMemo(() => {
    const c = new Map((customers ?? []).map((x) => [x.id, x.name]));
    const s = new Map((suppliers ?? []).map((x) => [x.id, x.name]));
    const i = new Map((items ?? []).map((x) => [x.id, x.name]));
    return {
      customers: customers ?? [],
      suppliers: suppliers ?? [],
      items: items ?? [],
      customerName: (id: string) => c.get(id) ?? 'Customer',
      supplierName: (id: string) => s.get(id) ?? 'Supplier',
      itemName: (id: string) => i.get(id) ?? 'Item',
    };
  }, [customers, suppliers, items]);
}
