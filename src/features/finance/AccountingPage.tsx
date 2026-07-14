import { useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import {
  useGetBankBalancesQuery,
  useGetCashBookQuery,
  useGetCustomerLedgerQuery,
  useGetOutstandingSummaryQuery,
  useGetSupplierLedgerQuery,
  useGetTrialBalanceQuery,
} from '@/api/financeApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';

export default function AccountingPage() {
  const [tab, setTab] = useState(0);
  const [ledgerParty, setLedgerParty] = useState<'customer' | 'supplier'>('customer');
  const [cashKind, setCashKind] = useState<'cash' | 'bank'>('cash');
  const { data: out } = useGetOutstandingSummaryQuery();
  const { data: cash } = useGetCashBookQuery('cash');
  const { data: bank } = useGetCashBookQuery('bank');

  return (
    <Stack spacing={2}>
      {/* Overview KPI strip — each tile filters the view below */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' } }}>
        <Kpi
          icon={SouthWestRoundedIcon} label="Receivable" value={formatCurrency(out?.receivable ?? 0, false)} color="success.main"
          active={tab === 0 && ledgerParty === 'customer'}
          onClick={() => { setTab(0); setLedgerParty('customer'); }}
        />
        <Kpi
          icon={NorthEastRoundedIcon} label="Payable" value={formatCurrency(out?.payable ?? 0, false)} color="error.main"
          active={tab === 0 && ledgerParty === 'supplier'}
          onClick={() => { setTab(0); setLedgerParty('supplier'); }}
        />
        <Kpi
          icon={PaymentsRoundedIcon} label="Cash in Hand" value={formatCurrency(cash?.balance ?? 0, false)}
          active={tab === 1 && cashKind === 'cash'}
          onClick={() => { setTab(1); setCashKind('cash'); }}
        />
        <Kpi
          icon={AccountBalanceRoundedIcon} label="Bank balance" value={formatCurrency(bank?.balance ?? 0, false)}
          active={tab === 1 && cashKind === 'bank'}
          onClick={() => { setTab(1); setCashKind('bank'); }}
        />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label="Ledgers" />
          <Tab label="Cash / Bank" />
          <Tab label="Trial Balance" />
        </Tabs>
        <CardContent>
          {tab === 0 && <Ledgers partyType={ledgerParty} onPartyType={setLedgerParty} />}
          {tab === 1 && <CashBank kind={cashKind} onKind={setCashKind} />}
          {tab === 2 && <TrialBalance />}
        </CardContent>
      </Card>
    </Stack>
  );
}

function Ledgers({ partyType, onPartyType }: { partyType: 'customer' | 'supplier'; onPartyType: (v: 'customer' | 'supplier') => void }) {
  const { customers, suppliers } = useLookups();
  const [partyId, setPartyId] = useState('');

  // Clear the selected party whenever the customer/supplier toggle changes.
  useEffect(() => { setPartyId(''); }, [partyType]);

  const custLedger = useGetCustomerLedgerQuery(partyId, { skip: partyType !== 'customer' || !partyId });
  const supLedger = useGetSupplierLedgerQuery(partyId, { skip: partyType !== 'supplier' || !partyId });
  const ledger = partyType === 'customer' ? custLedger.data : supLedger.data;
  const options = partyType === 'customer' ? customers : suppliers;
  const balLabel = partyType === 'customer' ? 'Receivable' : 'Payable';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <ToggleButtonGroup
          exclusive size="small" color="primary" value={partyType}
          onChange={(_, v) => { if (v) onPartyType(v); }}
        >
          <ToggleButton value="customer" sx={{ px: 2 }}>Customer</ToggleButton>
          <ToggleButton value="supplier" sx={{ px: 2 }}>Supplier</ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label={`Select ${partyType}`} value={partyId} onChange={(e) => setPartyId(e.target.value)} sx={{ flexGrow: 1, maxWidth: 420 }}>
          {options.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
        </TextField>
      </Stack>

      {!partyId ? (
        <EmptyState text={`Select a ${partyType} to view their ledger.`} />
      ) : !ledger ? (
        <EmptyState text="Loading ledger…" />
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>{ledger.name}</Typography>
            <Chip color={ledger.balance >= 0 ? 'primary' : 'default'} label={`${balLabel}: ${formatCurrency(ledger.balance, false)}`} sx={{ fontWeight: 700 }} />
          </Box>
          <LedgerTable rows={ledger.rows} closing={ledger.balance} />
        </>
      )}
    </Stack>
  );
}

function LedgerTable({ rows, closing }: { rows: { date: string; voucher: string; particulars: string; debit: number; credit: number; balance: number }[]; closing: number }) {
  if (rows.length === 0) return <EmptyState text="No ledger entries." />;
  const totalDr = rows.reduce((s, r) => s + r.debit, 0);
  const totalCr = rows.reduce((s, r) => s + r.credit, 0);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <Th>Date</Th><Th>Particulars</Th><Th right>Debit</Th><Th right>Credit</Th><Th right>Balance</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.date || '—'}</TableCell>
              <TableCell>{r.particulars}{r.voucher ? <Typography component="span" variant="caption" color="text.secondary"> · {r.voucher}</Typography> : ''}</TableCell>
              <TableCell align="right" sx={{ color: r.debit ? 'text.primary' : 'text.disabled' }}>{r.debit ? formatCurrency(r.debit, false) : '—'}</TableCell>
              <TableCell align="right" sx={{ color: r.credit ? 'success.main' : 'text.disabled' }}>{r.credit ? formatCurrency(r.credit, false) : '—'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(r.balance, false)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <Tf>Total</Tf><Tf />
            <Tf right>{formatCurrency(totalDr, false)}</Tf>
            <Tf right>{formatCurrency(totalCr, false)}</Tf>
            <Tf right>{formatCurrency(closing, false)}</Tf>
          </TableRow>
        </TableFooter>
      </Table>
    </Box>
  );
}

function CashBank({ kind, onKind }: { kind: 'cash' | 'bank'; onKind: (v: 'cash' | 'bank') => void }) {
  const { data } = useGetCashBookQuery(kind);
  const { data: bankBal } = useGetBankBalancesQuery(undefined, { skip: kind !== 'bank' });
  const rows = data?.rows ?? [];
  const totalIn = rows.reduce((s, r) => s + r.inflow, 0);
  const totalOut = rows.reduce((s, r) => s + r.outflow, 0);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup exclusive size="small" color="primary" value={kind} onChange={(_, v) => v && onKind(v)}>
          <ToggleButton value="cash" sx={{ px: 2 }}>Cash Book</ToggleButton>
          <ToggleButton value="bank" sx={{ px: 2 }}>Bank Book</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flexGrow: 1 }} />
        <Chip color="success" label={`Closing balance: ${formatCurrency(data?.balance ?? 0, false)}`} sx={{ fontWeight: 700 }} />
      </Stack>

      {/* Per-account bank reconciliation */}
      {kind === 'bank' && bankBal && bankBal.accounts.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Bank accounts</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow><Th>Account</Th><Th right>Opening</Th><Th right>Received (net)</Th><Th right>Balance</Th></TableRow>
              </TableHead>
              <TableBody>
                {bankBal.accounts.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{a.name}{a.bankName ? <Typography component="span" variant="caption" color="text.secondary"> · {a.bankName}</Typography> : ''}</TableCell>
                    <TableCell align="right">{formatCurrency(a.opening, false)}</TableCell>
                    <TableCell align="right" sx={{ color: a.received ? 'success.main' : 'text.disabled' }}>{a.received ? formatCurrency(a.received, false) : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(a.balance, false)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }} useFlexGap>
            {bankBal.unallocatedReceived > 0 && <Chip size="small" variant="outlined" label={`Untagged receipts: ${formatCurrency(bankBal.unallocatedReceived, false)}`} />}
            {bankBal.bankOutflow > 0 && <Chip size="small" variant="outlined" color="error" label={`Bank payments/expenses: ${formatCurrency(bankBal.bankOutflow, false)}`} />}
            {bankBal.bankCharges > 0 && <Chip size="small" variant="outlined" label={`Bank charges: ${formatCurrency(bankBal.bankCharges, false)}`} />}
            <Box sx={{ flexGrow: 1 }} />
            <Chip size="small" color="primary" label={`Net bank position: ${formatCurrency(bankBal.totalBalance, false)}`} sx={{ fontWeight: 700 }} />
          </Stack>
          {bankBal.bankOutflow > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Bank-mode supplier payments and expenses aren't tied to a specific account, so they reduce the overall net position.
            </Typography>
          )}
        </Box>
      )}

      {rows.length === 0 ? (
        <EmptyState text="No entries for this book yet." />
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <Th>Date</Th><Th>Particulars</Th><Th right>In</Th><Th right>Out</Th><Th right>Balance</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.date}</TableCell>
                  <TableCell>{r.particulars}<Typography component="span" variant="caption" color="text.secondary"> · {r.voucher}</Typography></TableCell>
                  <TableCell align="right" sx={{ color: r.inflow ? 'success.main' : 'text.disabled' }}>{r.inflow ? formatCurrency(r.inflow, false) : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: r.outflow ? 'error.main' : 'text.disabled' }}>{r.outflow ? formatCurrency(r.outflow, false) : '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(r.balance, false)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <Tf>Total</Tf><Tf />
                <Tf right>{formatCurrency(totalIn, false)}</Tf>
                <Tf right>{formatCurrency(totalOut, false)}</Tf>
                <Tf right>{formatCurrency(data?.balance ?? 0, false)}</Tf>
              </TableRow>
            </TableFooter>
          </Table>
        </Box>
      )}
    </Stack>
  );
}

function TrialBalance() {
  const { data } = useGetTrialBalanceQuery();
  const diff = Math.round(((data?.totalDebit ?? 0) - (data?.totalCredit ?? 0)) * 100) / 100;
  const balanced = Math.abs(diff) < 0.5;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          Simplified summary (derived ledger, not a strict double-entry trial balance).
        </Typography>
        <Chip size="small" color={balanced ? 'success' : 'warning'} label={balanced ? 'Balanced' : `Difference ${formatCurrency(Math.abs(diff), false)}`} />
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow><Th>Account</Th><Th right>Debit</Th><Th right>Credit</Th></TableRow>
          </TableHead>
          <TableBody>
            {(data?.rows ?? []).map((r, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ fontWeight: 600 }}>{r.account}</TableCell>
                <TableCell align="right" sx={{ color: r.debit ? 'text.primary' : 'text.disabled' }}>{r.debit ? formatCurrency(r.debit, false) : '—'}</TableCell>
                <TableCell align="right" sx={{ color: r.credit ? 'text.primary' : 'text.disabled' }}>{r.credit ? formatCurrency(r.credit, false) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <Tf>Total</Tf>
              <Tf right>{formatCurrency(data?.totalDebit ?? 0, false)}</Tf>
              <Tf right>{formatCurrency(data?.totalCredit ?? 0, false)}</Tf>
            </TableRow>
          </TableFooter>
        </Table>
      </Box>
    </Stack>
  );
}

function Kpi({ icon: Icon, label, value, color, onClick, active }: {
  icon: ComponentType<{ fontSize?: 'small' }>; label: string; value: string; color?: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      sx={{
        p: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        borderColor: active ? 'primary.main' : 'divider',
        borderWidth: active ? 2 : 1,
        bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.06) : 'background.paper',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': onClick ? { borderColor: 'primary.main', boxShadow: 1 } : undefined,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
        <Icon fontSize="small" />
        <Typography variant="caption" noWrap sx={{ flexGrow: 1 }}>{label}</Typography>
        {active && <FilterAltRoundedIcon fontSize="small" color="primary" />}
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25, color: color ?? 'text.primary' }}>{value}</Typography>
    </Paper>
  );
}

function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return <TableCell align={right ? 'right' : 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</TableCell>;
}
function Tf({ children, right }: { children?: ReactNode; right?: boolean }) {
  return <TableCell align={right ? 'right' : 'left'} sx={{ fontWeight: 800, color: 'text.primary' }}>{children}</TableCell>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 5 }}>
      <AccountBalanceRoundedIcon sx={{ fontSize: 38, color: 'text.disabled' }} />
      <Typography color="text.secondary" sx={{ textAlign: 'center' }}>{text}</Typography>
    </Stack>
  );
}
