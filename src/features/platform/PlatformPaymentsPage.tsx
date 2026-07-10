import { useState } from 'react';
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
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import {
  useApprovePlatformPaymentMutation,
  useGetPlatformPaymentsQuery,
  useRejectPlatformPaymentMutation,
} from '@/api/subscriptionApi';
import { formatCurrency } from '@/utils/format';
import type { PlatformPaymentRow, SubscriptionPaymentStatus } from '@/types/subscription';

const STATUS_COLOR: Record<SubscriptionPaymentStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

type Filter = SubscriptionPaymentStatus | 'all';

export default function PlatformPaymentsPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const { data, isLoading } = useGetPlatformPaymentsQuery(filter === 'all' ? undefined : filter);
  const [approve, { isLoading: approving }] = useApprovePlatformPaymentMutation();
  const [reject, { isLoading: rejecting }] = useRejectPlatformPaymentMutation();

  const [rejecting_, setRejecting] = useState<PlatformPaymentRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doApprove = async (p: PlatformPaymentRow) => {
    setError(null);
    try {
      await approve(p.id).unwrap();
      setToast(`Approved — ${p.organizationName} activated until the next renewal.`);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const doReject = async () => {
    if (!rejecting_) return;
    setError(null);
    try {
      await reject({ id: rejecting_.id, reviewNote: rejectNote || undefined }).unwrap();
      setToast(`Rejected payment from ${rejecting_.organizationName}.`);
      setRejecting(null);
      setRejectNote('');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ReceiptLongRoundedIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Subscription Payments</Typography>
      </Stack>

      <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ minHeight: 0 }}>
        <Tab label="Pending" value="pending" />
        <Tab label="Approved" value="approved" />
        <Tab label="Rejected" value="rejected" />
        <Tab label="All" value="all" />
      </Tabs>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          {isLoading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : (data?.length ?? 0) === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No {filter === 'all' ? '' : filter} payments.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cycle</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data!.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{p.organizationName ?? '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Renews {p.organizationRenewalDate ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{p.billingCycle}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {p.reference || '—'}
                        {p.note && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {p.note}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={STATUS_COLOR[p.status]} label={p.status} sx={{ textTransform: 'capitalize' }} />
                      </TableCell>
                      <TableCell align="right">
                        {p.status === 'pending' ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small" variant="contained" color="success"
                              disabled={approving} onClick={() => doApprove(p)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small" variant="outlined" color="error"
                              disabled={rejecting} onClick={() => setRejecting(p)}
                            >
                              Reject
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {p.periodEnd ? `→ ${p.periodEnd}` : '—'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(rejecting_)} onClose={() => setRejecting(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Reject payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {rejecting_?.organizationName} · {rejecting_ && formatCurrency(rejecting_.amount)}
          </Typography>
          <TextField
            label="Reason (shown to the tenant)" fullWidth multiline minRows={2}
            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doReject} disabled={rejecting}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}

function errMsg(e: unknown): string {
  const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg ?? 'Action failed.';
}
