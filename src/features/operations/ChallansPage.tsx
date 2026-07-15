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
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import {
  useCreateChallanMutation,
  useGetChallansQuery,
  useGetStockLotsQuery,
  useReportChallanMutation,
  useSettleChallanMutation,
} from '@/api/operationsApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import type { StockLot } from '@/types/domain';
import type { Challan, ChallanStatus } from '@/types/finance';

interface LineDraft { itemId: string; lotId: string; quantity: string; weight: string; rate: string; }
const emptyLine = (): LineDraft => ({ itemId: '', lotId: '', quantity: '', weight: '', rate: '' });
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_COLOR: Record<ChallanStatus, 'warning' | 'info' | 'success'> = {
  transferred: 'warning', reported: 'info', settled: 'success',
};

export default function ChallansPage() {
  const { items } = useLookups();
  const { data: lots } = useGetStockLotsQuery({ availableOnly: true });
  const { data: challans } = useGetChallansQuery();
  const [createChallan, { isLoading: creating }] = useCreateChallanMutation();
  const [reportChallan, { isLoading: reporting }] = useReportChallanMutation();
  const [settleChallan, { isLoading: settling }] = useSettleChallanMutation();

  const [date, setDate] = useState(today());
  const [agentName, setAgentName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lotsByItem = useMemo(() => {
    const m = new Map<string, StockLot[]>();
    for (const lot of lots ?? []) {
      if (!m.has(lot.itemId)) m.set(lot.itemId, []);
      m.get(lot.itemId)!.push(lot);
    }
    return m;
  }, [lots]);

  const activeItems = items.filter((i) => i.isActive);
  const recent = useMemo(() => (challans ?? []).slice(0, 20), [challans]);

  const updateLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const onItem = (idx: number, itemId: string) => {
    const itemLots = lotsByItem.get(itemId) ?? [];
    const lot = itemLots[0];
    updateLine(idx, { itemId, lotId: lot?.id ?? '', rate: lot ? String(lot.rate) : '' });
  };
  const onLot = (idx: number, lotId: string) => {
    const lot = (lots ?? []).find((l) => l.id === lotId);
    updateLine(idx, { lotId, rate: lot ? String(lot.rate) : '' });
  };

  const validLines = lines.filter((l) => l.itemId && l.lotId && Number(l.weight) > 0);
  const canSave = agentName.trim() && validLines.length > 0;

  const save = async () => {
    setError(null);
    try {
      const ch = await createChallan({
        date, agentName, vehicleNumber: vehicleNumber || undefined,
        lines: validLines.map((l) => ({ itemId: l.itemId, lotId: l.lotId, quantity: Number(l.quantity) || 0, weight: Number(l.weight), rate: Number(l.rate) || 0 })),
      }).unwrap();
      setToast(`Challan ${ch.challanNumber} transferred to ${ch.agentName}`);
      setAgentName(''); setVehicleNumber(''); setLines([emptyLine()]);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not create challan.');
    }
  };

  // ---- report / settle dialogs ----
  const [reportFor, setReportFor] = useState<Challan | null>(null);
  const [rSale, setRSale] = useState(''); const [rComm, setRComm] = useState(''); const [rOther, setROther] = useState('');
  const reportNet = (Number(rSale) || 0) - (Number(rComm) || 0) - (Number(rOther) || 0);

  const [settleFor, setSettleFor] = useState<Challan | null>(null);
  const [sAmount, setSAmount] = useState('');

  const submitReport = async () => {
    if (!reportFor) return;
    await reportChallan({ id: reportFor.id, reportedSaleAmount: Number(rSale) || 0, agentCommission: Number(rComm) || 0, otherCharges: Number(rOther) || 0 }).unwrap();
    setToast(`Bikri report saved for ${reportFor.challanNumber}`);
    setReportFor(null); setRSale(''); setRComm(''); setROther('');
  };
  const submitSettle = async () => {
    if (!settleFor) return;
    await settleChallan({ id: settleFor.id, settledDate: today(), settledAmount: Number(sAmount) || 0 }).unwrap();
    setToast(`${settleFor.challanNumber} settled`);
    setSettleFor(null); setSAmount('');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: { lg: 'stretch' }, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Transfer form (left) ---- */}
      <Stack spacing={2} sx={{ flex: { lg: '0 1 760px' }, width: '100%' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>For-Sale Challan</Typography>
          <Typography variant="body2" color="text.secondary">Transfer stock to another commission agent, then record their bikri report and settle.</Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                <TextField label="Vehicle (optional)" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} />
              </Stack>
              <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ maxWidth: { sm: 200 } }} />
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={1.5}>
          {lines.map((line, idx) => {
            const itemLots = line.itemId ? lotsByItem.get(line.itemId) ?? [] : [];
            return (
              <Card key={idx}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ flexGrow: 1, color: 'text.secondary' }}>Item {idx + 1}</Typography>
                      <IconButton size="small" onClick={() => setLines((p) => p.length === 1 ? p : p.filter((_, i) => i !== idx))} disabled={lines.length === 1}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <TextField select size="small" fullWidth label="Item" value={line.itemId} onChange={(e) => onItem(idx, e.target.value)}>
                        {activeItems.map((it) => <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>)}
                      </TextField>
                      <TextField select size="small" fullWidth label="Lot" value={line.lotId} onChange={(e) => onLot(idx, e.target.value)} disabled={!line.itemId}>
                        {itemLots.map((lot) => <MenuItem key={lot.id} value={lot.id}>{lot.lotNumber} · {lot.weightAvailable}kg</MenuItem>)}
                      </TextField>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                      <TextField size="small" label="Qty" type="number" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} />
                      <TextField size="small" label="Weight (kg)" type="number" value={line.weight} onChange={(e) => updateLine(idx, { weight: e.target.value })} />
                      <TextField size="small" label="Cost rate ₹" type="number" value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          <Button startIcon={<AddRoundedIcon />} variant="outlined" onClick={() => setLines((p) => [...p, emptyLine()])}>Add item</Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        <Button size="large" variant="contained" startIcon={<SwapHorizRoundedIcon />} onClick={save} disabled={!canSave || creating}>
          {creating ? 'Transferring…' : 'Create Transfer Challan'}
        </Button>
      </Stack>

      {/* ---- Divider between form and challans ---- */}
      <Divider orientation="vertical" flexItem sx={{ ml: { lg: 'auto' }, mr: { lg: 3 }, display: { xs: 'none', lg: 'block' } }} />

      {/* ---- Challans (far right) ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '8px !important' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <HistoryRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>Challans</Typography>
                <Chip size="small" label={(challans ?? []).length} />
              </Stack>
              {recent.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No challans yet. Created transfers show here.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: { lg: 'calc(100dvh - 220px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 }, '& > *': { flexShrink: 0 } }}>
                  {recent.map((c) => (
                    <Card key={c.id} variant="outlined">
                      <CardContent sx={{ py: '10px !important' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ fontWeight: 700 }} noWrap>{c.agentName}</Typography>
                              <Chip size="small" label={c.status} color={STATUS_COLOR[c.status]} sx={{ height: 18, fontSize: '0.62rem' }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                              {c.challanNumber} · {c.date} · {c.totalWeight}kg{c.status !== 'transferred' ? ` · net ${formatCurrency(c.netReceivable)}` : ''}
                            </Typography>
                          </Box>
                          {c.status === 'transferred' && <Button size="small" onClick={() => setReportFor(c)}>Report</Button>}
                          {c.status === 'reported' && <Button size="small" onClick={() => { setSettleFor(c); setSAmount(String(c.netReceivable)); }}>Settle</Button>}
                          {c.status === 'settled' && <Typography sx={{ fontWeight: 800, color: 'success.main' }}>{formatCurrency(c.settledAmount)}</Typography>}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Report dialog */}
      <Dialog open={Boolean(reportFor)} onClose={() => setReportFor(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Bikri Report · {reportFor?.challanNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Reported sale amount ₹" type="number" value={rSale} onChange={(e) => setRSale(e.target.value)} autoFocus />
            <Stack direction="row" spacing={2}>
              <TextField label="Agent commission ₹" type="number" value={rComm} onChange={(e) => setRComm(e.target.value)} />
              <TextField label="Other charges ₹" type="number" value={rOther} onChange={(e) => setROther(e.target.value)} />
            </Stack>
            <Box sx={{ display: 'flex', bgcolor: 'success.main', color: '#fff', borderRadius: 2, px: 2, py: 1 }}>
              <Typography sx={{ flexGrow: 1, fontWeight: 700 }}>Net receivable</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(reportNet, false)}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReportFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitReport} disabled={!(Number(rSale) > 0) || reporting}>Save Report</Button>
        </DialogActions>
      </Dialog>

      {/* Settle dialog */}
      <Dialog open={Boolean(settleFor)} onClose={() => setSettleFor(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Settle · {settleFor?.challanNumber}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Amount received ₹" type="number" value={sAmount} onChange={(e) => setSAmount(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSettleFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitSettle} disabled={!(Number(sAmount) > 0) || settling}>Settle</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
