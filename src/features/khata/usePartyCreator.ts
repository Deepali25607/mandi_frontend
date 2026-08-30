import { useState } from 'react';
import { useCreateCustomerMutation, useCreateSupplierMutation } from '@/api/mastersApi';
import type { PartyDraft } from './components/PartyFormDialog';

/** "Add Customer / Supplier" from Khata creates the real master record. */
export function usePartyCreator(onCreated: (id: string, draft: PartyDraft) => void) {
  const [createCustomer, { isLoading: cc }] = useCreateCustomerMutation();
  const [createSupplier, { isLoading: cs }] = useCreateSupplierMutation();
  const [error, setError] = useState<string | null>(null);

  const create = async (draft: PartyDraft) => {
    setError(null);
    try {
      const body = { name: draft.name, mobile: draft.phone ?? '', openingBalance: draft.openingBalance ?? 0 };
      const created = draft.type === 'customer' ? await createCustomer(body).unwrap() : await createSupplier(body).unwrap();
      onCreated(created.id, draft);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not create the party.');
    }
  };

  return { create, saving: cc || cs, error, clearError: () => setError(null) };
}
