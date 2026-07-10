import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useGetItemsQuery, useGetSuppliersQuery } from '@/api/mastersApi';
import { useCreateArrivalMutation, useGetArrivalsQuery } from '@/api/operationsApi';
import SupplierFormDialog from '@/components/masters/SupplierFormDialog';
import { formatCurrency } from '@/utils/format';
import type { Arrival } from '@/types/domain';

interface LineDraft {
  itemId: string;
  quantity: string;
  weight: string;
  rate: string;
}

const emptyLine = (): LineDraft => ({ itemId: '', quantity: '', weight: '', rate: '' });
const today = () => new Date().toISOString().slice(0, 10);

export default function ArrivalEntryPage() {
  const { data: items } = useGetItemsQuery();
  const { data: suppliers } = useGetSuppliersQuery();
  const { data: arrivals } = useGetArrivalsQuery();
  const [createArrival, { isLoading }] = useCreateArrivalMutation();

  const [date, setDate] = useState(today());
  const [supplierId, setSupplierId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transportCharges, setTransportCharges] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<Arrival | null>(null);
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);

  const activeItems = (items ?? []).filter((i) => i.isActive);
  const activeSuppliers = (suppliers ?? []).filter((s) => s.isActive);
  const supplierName = (id: string) => (suppliers ?? []).find((s) => s.id === id)?.name ?? 'Supplier';
  const itemName = (id: string) => (items ?? []).find((i) => i.id === id)?.name ?? 'Item';

  const lineAmount = (l: LineDraft) => (Number(l.weight) || 0) * (Number(l.rate) || 0);
  const total = lines.reduce((s, l) => s + lineAmount(l), 0);

  const updateLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validLines = lines.filter((l) => l.itemId && Number(l.weight) > 0 && Number(l.rate) > 0);
  const canSave = Boolean(supplierId) && validLines.length > 0;

  const save = async () => {
    setError(null);
    try {
      const arrival = await createArrival({
        date,
        supplierId,
        vehicleNumber: vehicleNumber || undefined,
        transportCharges: Number(transportCharges) || 0,
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity) || 0,
          weight: Number(l.weight),
          rate: Number(l.rate),
        })),
      }).unwrap();
      setToast(`Arrival ${arrival.arrivalNumber} saved · ${arrival.lines.length} lot(s) created`);
      setSupplierId('');
      setVehicleNumber('');
      setTransportCharges('');
      setLines([emptyLine()]);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save arrival.');
    }
  };

  const recent = useMemo(() => (arrivals ?? []).slice(0, 20), [arrivals]);

  return (
    <Box sx={{ display: 'flex', alignItems: { lg: 'stretch' }, flexDirection: { xs: 'column', lg: 'row' } }}>
      {/* ---- Entry form (left) ---- */}
      <Stack spacing={2} sx={{ flex: { lg: '0 1 760px' }, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>New Arrival Entry</Typography>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="Vehicle number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="HR55-AB-1234" />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flex: 2 }}>
                  <TextField select fullWidth label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    {activeSuppliers.length === 0 && <MenuItem disabled value="">No suppliers — add one with “New”</MenuItem>}
                    {activeSuppliers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name} · {s.village ?? s.code}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddAltRoundedIcon />}
                    onClick={() => setNewSupplierOpen(true)}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 56 }}
                  >
                    New
                  </Button>
                </Stack>
                <TextField
                  label="Transport ₹"
                  type="number"
                  value={transportCharges}
                  onChange={(e) => setTransportCharges(e.target.value)}
                  inputProps={{ inputMode: 'decimal', min: 0 }}
                  placeholder="0"
                  sx={{ flex: 1 }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={1.5}>
          {lines.map((line, idx) => (
            <Card key={idx}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ flexGrow: 1, color: 'text.secondary' }}>
                      Item {idx + 1}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {formatCurrency(lineAmount(line), false)}
                    </Typography>
                    <IconButton size="small" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <TextField select label="Item" value={line.itemId} onChange={(e) => updateLine(idx, { itemId: e.target.value })} size="small">
                    {activeItems.map((it) => (
                      <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={1.5}>
                    <TextField label="Bags/Qty" type="number" size="small" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                    <TextField label="Weight (kg)" type="number" size="small" value={line.weight} onChange={(e) => updateLine(idx, { weight: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                    <TextField label="Rate ₹" type="number" size="small" value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          <Button startIcon={<AddRoundedIcon />} onClick={addLine} variant="outlined">
            Add another item
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {/* Sticky summary footer */}
        <Card sx={{ position: 'sticky', bottom: 8 }}>
          <CardContent sx={{ py: '12px !important' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">Total arrival value</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{formatCurrency(total, false)}</Typography>
              </Box>
              <Button size="large" variant="contained" onClick={save} disabled={!canSave || isLoading}>
                {isLoading ? 'Saving…' : 'Save Arrival'}
              </Button>
            </Stack>
            <Divider sx={{ my: 0 }} />
          </CardContent>
        </Card>
      </Stack>

      {/* ---- Divider between form and recent activity ---- */}
      <Divider orientation="vertical" flexItem sx={{ ml: { lg: 'auto' }, mr: { lg: 3 }, display: { xs: 'none', lg: 'block' } }} />

      {/* ---- Recent arrivals (far right) ---- */}
      <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
        <Card variant="outlined">
          <CardContent sx={{ pb: '8px !important' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <HistoryRoundedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>Recent arrivals</Typography>
              <Chip size="small" label={(arrivals ?? []).length} />
            </Stack>
            {recent.length === 0 ? (
              <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                No arrivals yet. Saved arrivals show here.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ maxHeight: { lg: 'calc(100dvh - 180px)' }, overflowY: { lg: 'auto' }, pr: { lg: 0.5 } }}>
                {recent.map((a) => (
                  <Card key={a.id} variant="outlined">
                    <CardActionArea onClick={() => setDetail(a)} sx={{ p: 1.25 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }} noWrap>{supplierName(a.supplierId)}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {a.arrivalNumber} · {a.date} · {a.lines.length} lot(s) · {a.totalWeight}kg{a.vehicleNumber ? ` · ${a.vehicleNumber}` : ''}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 800 }}>{formatCurrency(a.totalValue)}</Typography>
                        <ChevronRightRoundedIcon color="action" fontSize="small" />
                      </Stack>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
        </Box>
      </Box>

      {/* ---- Detail dialog ---- */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                {supplierName(detail.supplierId)}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
                  {detail.arrivalNumber} · {detail.date}{detail.vehicleNumber ? ` · ${detail.vehicleNumber}` : ''}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetail(null)} size="small"><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Weight</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{itemName(l.itemId)}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{l.lotNumber}</Typography></TableCell>
                      <TableCell align="right">{l.quantity}</TableCell>
                      <TableCell align="right">{l.weight} kg</TableCell>
                      <TableCell align="right">{formatCurrency(l.rate, false)}</TableCell>
                      <TableCell align="right">{formatCurrency(l.amount, false)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Stack spacing={0.5} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">{detail.totalQuantity} bags · {detail.totalWeight} kg</Typography>
                  <Typography sx={{ fontWeight: 700 }}>Goods {formatCurrency(detail.totalValue, false)}</Typography>
                </Stack>
                {detail.transportCharges > 0 && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Transport (bhada)</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{formatCurrency(detail.transportCharges, false)}</Typography>
                    </Stack>
                    <Divider sx={{ my: 0.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 800 }}>Total cost</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatCurrency(detail.totalValue + detail.transportCharges, false)}</Typography>
                    </Stack>
                  </>
                )}
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      <SupplierFormDialog
        open={newSupplierOpen}
        onClose={() => setNewSupplierOpen(false)}
        onSaved={(s) => {
          setSupplierId(s.id);
          setToast(`Supplier ${s.name} added`);
        }}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
