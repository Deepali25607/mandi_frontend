import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import WidgetsRoundedIcon from '@mui/icons-material/WidgetsRounded';
import {
  useCreateCrateTransactionMutation,
  useGetCrateBalancesQuery,
} from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import type { CrateDirection, CrateParty } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);

export default function CratesPage() {
  const [tab, setTab] = useState(0);
  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Crate Management</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label="Record" />
        <Tab label="Balances" />
      </Tabs>
      {tab === 0 ? <RecordForm /> : <Balances />}
    </Stack>
  );
}

function RecordForm() {
  const { customers, suppliers } = useLookups();
  const [create, { isLoading }] = useCreateCrateTransactionMutation();
  const [partyType, setPartyType] = useState<CrateParty>('customer');
  const [partyId, setPartyId] = useState('');
  const [direction, setDirection] = useState<CrateDirection>('out');
  const [quantity, setQuantity] = useState('');
  const [damaged, setDamaged] = useState('');
  const [date, setDate] = useState(today());
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = partyType === 'customer' ? customers : suppliers;

  const save = async () => {
    setError(null);
    try {
      await create({
        date, partyType, partyId, direction,
        quantity: Number(quantity) || 0, damaged: Number(damaged) || 0,
      }).unwrap();
      setToast('Crate movement recorded');
      setQuantity(''); setDamaged('');
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save.');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <ToggleButtonGroup exclusive size="small" color="primary" value={partyType} onChange={(_, v) => { if (v) { setPartyType(v); setPartyId(''); } }} fullWidth>
            <ToggleButton value="customer">Customer</ToggleButton>
            <ToggleButton value="supplier">Supplier</ToggleButton>
          </ToggleButtonGroup>
          <TextField select label={partyType === 'customer' ? 'Customer' : 'Supplier'} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            {options.filter((o) => o.isActive).map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </TextField>
          <ToggleButtonGroup exclusive size="small" color="primary" value={direction} onChange={(_, v) => v && setDirection(v)} fullWidth>
            <ToggleButton value="out">Out (issued)</ToggleButton>
            <ToggleButton value="in">In (returned)</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={2}>
            <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputProps={{ inputMode: 'numeric' }} />
            <TextField label="Damaged" type="number" value={damaged} onChange={(e) => setDamaged(e.target.value)} inputProps={{ inputMode: 'numeric' }} />
            <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <Button size="large" variant="contained" startIcon={<WidgetsRoundedIcon />} onClick={save} disabled={!partyId || !(Number(quantity) > 0 || Number(damaged) > 0) || isLoading}>
            Record Movement
          </Button>
        </Stack>
      </CardContent>
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Card>
  );
}

function Balances() {
  const { data, isLoading } = useGetCrateBalancesQuery();
  if (isLoading) return <Typography color="text.secondary">Loading…</Typography>;
  if (!data || data.length === 0) return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No crate movements yet.</Typography>;
  return (
    <Stack spacing={1}>
      {data.map((r) => (
        <Card key={`${r.partyType}:${r.partyId}`}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '12px !important' }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} noWrap>{r.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {r.partyType} · out {r.out} · in {r.in}{r.damaged ? ` · damaged ${r.damaged}` : ''}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{r.balance}</Typography>
              <Typography variant="caption" color="text.secondary">crates</Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
