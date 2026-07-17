import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import {
  useCreateCashTransferMutation,
  useDeleteCashTransferMutation,
  useGetBankAccountsQuery,
  useGetBankBalancesQuery,
  useGetCashBookQuery,
  useGetCashTransfersQuery,
  useUpdateCashTransferMutation,
} from '@/api/financeApi';
import { useAppSelector } from '@/store/hooks';
import { formatCurrency } from '@/utils/format';
import type { CashTransfer, TransferDirection } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);

export default function CashTransferPage() {
  const { data: bankAccounts } = useGetBankAccountsQuery();
  const { data: transfers } = useGetCashTransfersQuery();
  // Context balances come from the accounting module; tolerate them being
  // unavailable (plan without Accounting / role without access).
  const { data: bankBal } = useGetBankBalancesQuery();
  const { data: cashBook } = useGetCashBookQuery('cash');
  const [createTransfer, { isLoading: creating }] = useCreateCashTransferMutation();
  const [updateTransfer, { isLoading: updating }] = useUpdateCashTransferMutation();
  const [deleteTransfer, { isLoading: deleting }] = useDeleteCashTransferMutation();
  const isAdmin = useAppSelector((s) => s.auth.user?.role) === 'org_admin';

  const [direction, setDirection] = useState<TransferDirection>('cash_to_bank');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Admin-only: transfer being edited (form switches to update mode) / pending delete.
  const [editing, setEditing] = useState<CashTransfer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CashTransfer | null>(null);
  const saving = creating || updating;

  const activeBanks = useMemo(() => (bankAccounts ?? []).filter((b) => b.isActive), [bankAccounts]);
  const bankName = (id: string) => (bankAccounts ?? []).find((b) => b.id === id)?.name ?? '—';
  const cashInHand = cashBook?.balance;
  const accountBalance = bankBal?.accounts.find((a) => a.id === bankAccountId)?.balance;
  const toBank = direction === 'cash_to_bank';

  const canSave = Boolean(bankAccountId) && Number(amount) > 0;
  const recent = useMemo(() => (transfers ?? []).slice(0, 20), [transfers]);

  const resetForm = () => {
    setEditing(null);
    setDirection('cash_to_bank');
    setBankAccountId('');
    setAmount('');
    setDate(today());
    setNotes('');
    setError(null);
  };

  const enterEdit = (t: CashTransfer) => {
    setEditing(t);
    setDirection(t.direction);
    setBankAccountId(t.bankAccountId);
    setAmount(String(t.amount));
    setDate(t.date);
    setNotes(t.notes ?? '');
    setError(null);
  };

  const save = async () => {
    setError(null);
    const body = { date, direction, bankAccountId, amount: Number(amount), notes: notes || undefined };
    try {
      if (editing) {
        const res = await updateTransfer({ id: editing.id, body }).unwrap();
        setToast(`${res.transferNumber} updated.`);
        resetForm();
      } else {
        const res = await createTransfer(body).unwrap();
        setToast(`${res.transferNumber}: ${formatCurrency(res.amount, false)} ${toBank ? 'deposited to' : 'withdrawn from'} ${bankName(bankAccountId)}`);
        setAmount('');
        setNotes('');
      }
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? `Could not ${editing ? 'update' : 'record'} the transfer.`);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTransfer(confirmDelete.id).unwrap();
      setToast(`${confirmDelete.transferNumber} deleted.`);
      if (editing?.id === confirmDelete.id) resetForm();
      setConfirmDelete(null);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not delete the transfer.');
      setConfirmDelete(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: { lg: 'stretch' }, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Transfer form ---- */}
      <Stack spacing={2} sx={{ flex: { lg: '0 1 760px' }, width: '100%' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Cash / Bank Transfer</Typography>
          <Typography variant="body2" color="text.secondary">
            Move money between Cash in Hand and a bank account. This is an internal transfer — it doesn't affect any customer or supplier.
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <ToggleButtonGroup
                exclusive fullWidth color="primary" value={direction}
                onChange={(_, v) => { if (v) setDirection(v); }}
              >
                <ToggleButton value="cash_to_bank" sx={{ py: 1.25, fontWeight: 700 }}>Cash → Bank (Deposit)</ToggleButton>
                <ToggleButton value="bank_to_cash" sx={{ py: 1.25, fontWeight: 700 }}>Bank → Cash (Withdraw)</ToggleButton>
              </ToggleButtonGroup>

              {/* Live balances for context */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {cashInHand !== undefined && (
                  <Chip variant="outlined" color={toBank ? 'primary' : 'default'} label={`Cash in Hand: ${formatCurrency(cashInHand, false)}`} sx={{ fontWeight: 700 }} />
                )}
                {accountBalance !== undefined && (
                  <Chip variant="outlined" color={toBank ? 'default' : 'primary'} label={`${bankName(bankAccountId)}: ${formatCurrency(accountBalance, false)}`} sx={{ fontWeight: 700 }} />
                )}
              </Stack>

              <TextField
                select label="Bank account" value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                helperText={activeBanks.length === 0 ? 'No bank accounts yet — add one under Bank Accounts' : (toBank ? 'Account to deposit into' : 'Account to withdraw from')}
              >
                {activeBanks.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}{b.bankName ? ` · ${b.bankName}` : ''}</MenuItem>
                ))}
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Amount ₹" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
                <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
              </Stack>
              <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

              {editing && (
                <Alert severity="info">
                  Editing {editing.transferNumber} — saving will overwrite the original entry.
                </Alert>
              )}
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction="row" spacing={1}>
                <Button
                  size="large" variant="contained" fullWidth
                  startIcon={editing ? <EditRoundedIcon /> : <CompareArrowsRoundedIcon />}
                  onClick={save} disabled={!canSave || saving}
                >
                  {saving ? 'Saving…' : editing ? `Update ${editing.transferNumber}` : toBank ? 'Deposit to Bank' : 'Withdraw to Cash'}
                </Button>
                {editing && (
                  <Button size="large" variant="outlined" color="inherit" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Divider orientation="vertical" flexItem sx={{ ml: { lg: 'auto' }, mr: { lg: 3 }, display: { xs: 'none', lg: 'block' } }} />

      {/* ---- Recent transfers ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <HistoryRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>Recent transfers</Typography>
                <Chip size="small" label={(transfers ?? []).length} />
              </Stack>
              {recent.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No transfers yet.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: { lg: 'calc(100dvh - 220px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 }, '& > *': { flexShrink: 0 } }}>
                  {recent.map((t) => {
                    const dep = t.direction === 'cash_to_bank';
                    return (
                      <Card key={t.id} variant="outlined" sx={editing?.id === t.id ? { borderColor: 'primary.main' } : undefined}>
                        <Box sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700 }} noWrap>
                              {dep ? 'Cash → Bank' : 'Bank → Cash'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                              {t.transferNumber} · {t.date} · {bankName(t.bankAccountId)}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontWeight: 800, color: dep ? 'success.main' : 'warning.main' }}>
                            {formatCurrency(t.amount)}
                          </Typography>
                          {isAdmin && (
                            <Stack direction="row" sx={{ flexShrink: 0 }}>
                              <IconButton size="small" onClick={() => enterEdit(t)} disabled={editing?.id === t.id} aria-label={`Edit ${t.transferNumber}`}>
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setConfirmDelete(t)} aria-label={`Delete ${t.transferNumber}`}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </Box>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete transfer {confirmDelete?.transferNumber}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently removes the {formatCurrency(confirmDelete?.amount ?? 0, false)}{' '}
            {confirmDelete?.direction === 'cash_to_bank' ? 'deposit to' : 'withdrawal from'}{' '}
            {bankName(confirmDelete?.bankAccountId ?? '')} and adjusts the cash/bank balances. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
