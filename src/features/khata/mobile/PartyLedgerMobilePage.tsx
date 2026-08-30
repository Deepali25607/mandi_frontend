import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import { useAppSelector } from '@/store/hooks';
import { KHATA } from '../khataTheme';
import { usePartyLedger } from '../hooks';
import { useLedgerController } from '../useLedgerController';
import { formatKhataAmount, groupRowsByDay, phoneDigits } from '../utils';
import KhataScaffold from '../components/KhataScaffold';
import PartyAvatar from '../components/PartyAvatar';
import QuickActionBar from '../components/QuickActionBar';
import LedgerEntryCard, { DateDivider, LedgerColumnHeader } from '../components/LedgerEntryCard';

/** Ledger of one party — the Khata "detail" screen (phone layout). */
export default function PartyLedgerMobilePage() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const businessName = user?.organizationName ?? 'My Business';

  const { party, rows, balance } = usePartyLedger(partyId);
  const groups = useMemo(() => groupRowsByDay(rows), [rows]);
  const ctl = useLedgerController(party, rows, balance, businessName);

  if (!party) {
    return (
      <KhataScaffold
        header={
          <Box sx={{ bgcolor: KHATA.blue, color: '#fff', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/parties')} sx={{ color: '#fff' }}><ArrowBackRoundedIcon /></IconButton>
            <Typography sx={{ fontWeight: 700, fontSize: 20 }}>Party not found</Typography>
          </Box>
        }
      >
        <Typography sx={{ p: 3, color: KHATA.muted }}>This party no longer exists.</Typography>
      </KhataScaffold>
    );
  }

  const willGive = balance < 0;
  const balanceLabel = willGive ? 'You will give' : 'You will get';
  const balanceColor = willGive ? KHATA.green : KHATA.red;
  const isCustomer = party.type === 'customer';

  const header = (
    <Box sx={{ bgcolor: KHATA.blue, color: '#fff', display: 'flex', alignItems: 'center', pl: 0.5, pr: 0.5, py: 1.25, gap: 0.5 }}>
      <IconButton onClick={() => navigate('/parties')} sx={{ color: '#fff' }} aria-label="back">
        <ArrowBackRoundedIcon sx={{ fontSize: 30 }} />
      </IconButton>
      <PartyAvatar name={party.name} size={60} onBlue />
      <ButtonBase onClick={ctl.openSettings} sx={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, ml: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, maxWidth: '100%' }}>
          <Typography noWrap sx={{ fontSize: 19, fontWeight: 700, minWidth: 0 }}>{party.name}</Typography>
          <Box sx={{ bgcolor: '#4d8ae0', color: '#fff', borderRadius: '6px', px: 0.75, py: 0.125, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{isCustomer ? 'Customer' : 'Supplier'}</Box>
        </Box>
        <Typography sx={{ fontSize: 15, opacity: 0.95 }}>View settings</Typography>
      </ButtonBase>
      <IconButton
        component="a"
        href={party.phone ? `tel:${phoneDigits(party.phone)}` : undefined}
        onClick={party.phone ? undefined : ctl.openSettings}
        sx={{ color: '#fff', p: 1 }}
        aria-label="call"
      >
        <CallRoundedIcon sx={{ fontSize: 28 }} />
      </IconButton>
    </Box>
  );

  const footer = (
    <Box sx={{ display: 'flex', gap: 2.5, p: 2, pt: 1.5, bgcolor: KHATA.surface, boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
      <ButtonBase onClick={() => ctl.openNew('gave')} sx={{ flex: 1, height: 60, borderRadius: '6px', bgcolor: KHATA.red, color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 1.5 }}>
        YOU GAVE ₹
      </ButtonBase>
      <ButtonBase onClick={() => ctl.openNew('got')} sx={{ flex: 1, height: 60, borderRadius: '6px', bgcolor: KHATA.green, color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 1.5 }}>
        YOU GOT ₹
      </ButtonBase>
    </Box>
  );

  return (
    <KhataScaffold header={header} footer={footer}>
      {/* Balance card sits on the blue header background and scrolls away. */}
      <Box sx={{ bgcolor: KHATA.blue, px: 2, pb: 2.5, pt: 1 }}>
        <Box sx={{ bgcolor: KHATA.surface, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 2.25 }}>
            <Typography sx={{ flex: 1, fontSize: 19, color: '#3f4a55' }}>{balance === 0 ? 'Settled up' : balanceLabel}</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: balance === 0 ? KHATA.text : balanceColor }}>{formatKhataAmount(balance)}</Typography>
          </Box>
          <ButtonBase onClick={ctl.openCollection} sx={{ width: '100%', bgcolor: KHATA.reminderStrip, px: 2.5, py: 2, justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 17, color: '#3f4a55' }}>
              {party.reminderDate ? `Collection reminder on ${new Date(`${party.reminderDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Set collection reminder'}
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: KHATA.blue, letterSpacing: 0.5 }}>{party.reminderDate ? 'EDIT' : 'ADD'}</Typography>
          </ButtonBase>
        </Box>
      </Box>

      {/* Sticks under the blue header once the balance card scrolls out. */}
      <Box sx={{ position: 'sticky', top: 80, zIndex: 10 }}>
        <QuickActionBar onReport={ctl.downloadReport} onReminder={() => ctl.openReminder('whatsapp')} onSms={() => ctl.openReminder('sms')} />
      </Box>

      <Box sx={{ pb: 3 }}>
        {groups.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: KHATA.muted, py: 8, px: 4 }}>
            No entries yet. Sales, receipts, bills and payments for this party will appear here.
          </Typography>
        )}
        {groups.map((g, gi) => (
          <Box key={g.key}>
            <DateDivider iso={g.iso} showAge={gi === 0} />
            {gi === 0 && <LedgerColumnHeader />}
            {g.rows.map((row) => (
              <LedgerEntryCard key={row.id} row={row} onClick={() => ctl.openEdit(row)} />
            ))}
          </Box>
        ))}
      </Box>

      {ctl.dialogs}
    </KhataScaffold>
  );
}
