import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDeleteCustomerMutation, useDeleteSupplierMutation, useUpdateCustomerMutation, useUpdateSupplierMutation } from '@/api/mastersApi';
import { useCreateCollectionMutation, useCreateSupplierPaymentMutation, useDeleteCollectionMutation, useGetCollectionsQuery } from '@/api/financeApi';
import { KHATA } from './khataTheme';
import { setReminder } from './khataSlice';
import type { EntryType, LedgerRow, Party } from './types';
import { formatKhataAmount, formatShortDate, sourceLabel } from './utils';
import { downloadLedgerPdf } from './ledgerPdf';
import EntryFormDialog, { type EntryDraft } from './components/EntryFormDialog';
import PartyFormDialog, { type PartyDraft } from './components/PartyFormDialog';
import ReminderDialog, { type ReminderChannel } from './components/ReminderDialog';

function errorText(e: unknown, fallback: string): string {
  const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg ?? fallback;
}

/**
 * All ledger-level actions and their dialogs, wired to the real ERP:
 *  - customer "You got ₹"  → Collection receipt   (POST /collections)
 *  - supplier "You gave ₹" → Supplier payment     (POST /settlements/payments)
 *  - customer "You gave ₹" / supplier "You got ₹" → goods movements, which
 *    must go through Sale Entry / Arrivals + Settlements so stock, commission
 *    and market fee stay correct — the dialog explains and links there.
 *  - settings → update the master; archive → soft-delete in masters.
 * Shared by the mobile ledger screen and the desktop ledger panel.
 */
export function useLedgerController(party: Party | null, rows: LedgerRow[], balance: number, businessName: string) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isAdmin = role === 'org_admin';

  const [createCollection, { isLoading: savingCollection }] = useCreateCollectionMutation();
  const [createPayment, { isLoading: savingPayment }] = useCreateSupplierPaymentMutation();
  const [deleteCollection, { isLoading: deleting }] = useDeleteCollectionMutation();
  const [updateCustomer, { isLoading: uc }] = useUpdateCustomerMutation();
  const [updateSupplier, { isLoading: us }] = useUpdateSupplierMutation();
  const [deleteCustomer, { isLoading: dc }] = useDeleteCustomerMutation();
  const [deleteSupplier, { isLoading: ds }] = useDeleteSupplierMutation();
  // Needed to resolve a receipt's voucher number back to its id for admin delete.
  const { data: collections } = useGetCollectionsQuery(undefined, { skip: !isAdmin || party?.type !== 'customer' });

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<EntryType | null>(null);
  const [detail, setDetail] = useState<LedgerRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [reminder, setReminderChannel] = useState<ReminderChannel | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionDate, setCollectionDate] = useState('');
  const [confirm, setConfirm] = useState<'archive' | 'delete-receipt' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isCustomer = party?.type === 'customer';
  /** The money entry this party supports directly: receipts for customers, payments for suppliers. */
  const moneyType: EntryType = isCustomer ? 'got' : 'gave';

  const openNew = (type: EntryType) => {
    if (type === moneyType) { setEntryError(null); setEntryOpen(true); }
    else setGuidance(type);
  };
  const openEdit = (row: LedgerRow) => setDetail(row);
  const openSettings = () => { setSettingsError(null); setSettingsOpen(true); };
  const openReminder = (channel: ReminderChannel) => setReminderChannel(channel);
  const openCollection = () => { setCollectionDate(party?.reminderDate ?? ''); setCollectionOpen(true); };
  const downloadReport = () => { if (party) downloadLedgerPdf(businessName, party, rows, balance); };

  const saveEntry = async (draft: EntryDraft) => {
    if (!party) return;
    try {
      if (isCustomer) {
        await createCollection({ date: draft.date, customerId: party.id, amount: draft.amount, paymentMode: draft.paymentMode, reference: draft.reference, notes: draft.note }).unwrap();
        setToast(`Receipt of ${formatKhataAmount(draft.amount)} recorded`);
      } else {
        await createPayment({ date: draft.date, supplierId: party.id, amount: draft.amount, paymentMode: draft.paymentMode, reference: draft.reference, notes: draft.note }).unwrap();
        setToast(`Payment of ${formatKhataAmount(draft.amount)} recorded`);
      }
      setEntryOpen(false);
    } catch (e) {
      setEntryError(errorText(e, 'Could not save the entry.'));
    }
  };

  const saveParty = async (draft: PartyDraft) => {
    if (!party) return;
    try {
      const body = { name: draft.name, mobile: draft.phone ?? '' };
      if (isCustomer) await updateCustomer({ id: party.id, body }).unwrap();
      else await updateSupplier({ id: party.id, body }).unwrap();
      setSettingsOpen(false);
      setToast('Details saved');
    } catch (e) {
      setSettingsError(errorText(e, 'Could not save the details.'));
    }
  };

  const doConfirm = async () => {
    if (!party) return;
    try {
      if (confirm === 'archive') {
        if (isCustomer) await deleteCustomer(party.id).unwrap();
        else await deleteSupplier(party.id).unwrap();
        setSettingsOpen(false);
        navigate('/parties', { replace: true });
      } else if (confirm === 'delete-receipt' && detail) {
        const receipt = collections?.find((c) => c.collectionNumber === detail.voucher);
        if (!receipt) throw new Error('not found');
        await deleteCollection(receipt.id).unwrap();
        setDetail(null);
        setToast(`Receipt ${detail.voucher} deleted — amount is due again`);
      }
    } catch (e) {
      setToast(errorText(e, 'Action failed.'));
    }
    setConfirm(null);
  };

  const saveReminderDate = () => {
    if (!party) return;
    dispatch(setReminder({ partyId: party.id, date: collectionDate || undefined }));
    setCollectionOpen(false);
    setToast(collectionDate ? 'Collection reminder set' : 'Collection reminder removed');
  };

  const canDeleteDetail = Boolean(isAdmin && detail?.source === 'collection' && detail.voucher && collections?.some((c) => c.collectionNumber === detail.voucher));

  const dialogs: ReactNode = party ? (
    <>
      <EntryFormDialog
        open={entryOpen}
        partyName={party.name}
        type={moneyType}
        saving={savingCollection || savingPayment}
        error={entryError}
        onClose={() => setEntryOpen(false)}
        onSave={saveEntry}
      />

      {/* Goods movements are booked through the operational modules. */}
      <Dialog open={Boolean(guidance)} onClose={() => setGuidance(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: KHATA.blue }}>{isCustomer ? 'Credit sale to a customer' : 'Goods received from a supplier'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: KHATA.muted, fontSize: 14 }}>
            {isCustomer
              ? `What ${party.name} owes you grows through credit sales. Record the sale in Sale Entry (items, lots, rates) and it appears here automatically with commission and market fee applied.`
              : `What you owe ${party.name} grows when their lots are sold and settled. Record arrivals in Arrival Entry and finalise the amount in Settlements — the bill then shows here.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGuidance(null)} sx={{ color: KHATA.muted }}>Close</Button>
          <Button variant="contained" onClick={() => navigate(isCustomer ? '/sales' : '/settlements')} sx={{ bgcolor: KHATA.blue, '&:hover': { bgcolor: KHATA.blueDark } }}>
            {isCustomer ? 'Open Sale Entry' : 'Open Settlements'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry detail (read-only view of the underlying document). */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="xs" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 700, color: detail.type === 'gave' ? KHATA.red : KHATA.green }}>
              {detail.type === 'gave' ? 'You gave' : 'You got'} {formatKhataAmount(detail.amount)}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.75, fontSize: 14 }}>
                <Typography sx={{ color: KHATA.muted }}>Type</Typography><Typography>{sourceLabel(detail.source)}</Typography>
                <Typography sx={{ color: KHATA.muted }}>Date</Typography><Typography>{formatShortDate(detail.at)}</Typography>
                {detail.voucher && (<><Typography sx={{ color: KHATA.muted }}>Voucher</Typography><Typography>{detail.voucher}</Typography></>)}
                <Typography sx={{ color: KHATA.muted }}>Balance after</Typography>
                <Typography sx={{ color: detail.balanceAfter >= 0 ? KHATA.red : KHATA.green, fontWeight: 600 }}>{formatKhataAmount(detail.balanceAfter)}</Typography>
              </Box>
              <Typography sx={{ color: KHATA.muted, fontSize: 13, mt: 2 }}>
                {detail.source === 'sale' && 'Edit this sale from Sale Entry.'}
                {detail.source === 'bill' && 'Bills are managed in Settlements.'}
                {detail.source === 'payment' && 'Supplier payments are managed in Settlements.'}
                {detail.source === 'adjustment' && 'Managed in Adjustments.'}
                {detail.source === 'opening' && 'Set on the party in the masters.'}
                {detail.source === 'collection' && (isAdmin ? 'Receipts can be deleted by an admin; the amount becomes due again.' : 'Receipts can be deleted by an Org Admin from Collections.')}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              {canDeleteDetail && <Button color="error" onClick={() => setConfirm('delete-receipt')} sx={{ mr: 'auto' }}>Delete receipt</Button>}
              {detail.source === 'sale' && <Button onClick={() => navigate('/sales')}>Open Sales</Button>}
              <Button variant="contained" onClick={() => setDetail(null)} sx={{ bgcolor: KHATA.blue, '&:hover': { bgcolor: KHATA.blueDark } }}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <PartyFormDialog
        open={settingsOpen}
        type={party.type}
        party={party}
        saving={uc || us || dc || ds}
        error={settingsError}
        onClose={() => setSettingsOpen(false)}
        onSave={saveParty}
        onDelete={isAdmin ? () => setConfirm('archive') : undefined}
      />
      <ReminderDialog
        open={Boolean(reminder)}
        party={party}
        balance={balance}
        businessName={businessName}
        channel={reminder ?? 'whatsapp'}
        onClose={() => setReminderChannel(null)}
        onSent={() => setToast('Reminder opened in your messaging app.')}
      />

      <Dialog open={collectionOpen} onClose={() => setCollectionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: KHATA.blue }}>Collection reminder</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: KHATA.muted, mb: 2, fontSize: 14 }}>
            {balance > 0 ? `Pick the date you expect ${party.name} to pay ${formatKhataAmount(balance)}.` : 'Pick a date to follow up with this party.'} Saved on this device.
          </Typography>
          <TextField type="date" label="Reminder date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {party.reminderDate && <Button color="error" onClick={() => { setCollectionDate(''); dispatch(setReminder({ partyId: party.id })); setCollectionOpen(false); setToast('Collection reminder removed'); }} sx={{ mr: 'auto' }}>Remove</Button>}
          <Button onClick={() => setCollectionOpen(false)} sx={{ color: KHATA.muted }}>Cancel</Button>
          <Button variant="contained" disabled={!collectionDate} onClick={saveReminderDate} sx={{ bgcolor: KHATA.blue, '&:hover': { bgcolor: KHATA.blueDark } }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{confirm === 'archive' ? `Archive ${party.name}?` : `Delete receipt ${detail?.voucher}?`}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: KHATA.muted }}>
            {confirm === 'archive'
              ? 'The party is hidden from Khata and the masters. Its transactions and balance are kept and it can be restored from the masters.'
              : `${formatKhataAmount(detail?.amount ?? 0)} will be due from ${party.name} again. This cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirm(null)} sx={{ color: KHATA.muted }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleting || dc || ds} onClick={doConfirm}>{confirm === 'archive' ? 'Archive' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} />
    </>
  ) : null;

  return { openNew, openEdit, openSettings, openReminder, openCollection, downloadReport, dialogs };
}

