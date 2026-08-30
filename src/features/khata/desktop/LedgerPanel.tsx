import { Box, Button, Chip, Divider, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { useAppSelector } from '@/store/hooks';
import { usePartyLedger } from '../hooks';
import { useLedgerController } from '../useLedgerController';
import { formatKhataAmount, formatShortDate, formatTime, phoneDigits, timeAgo } from '../utils';
import PartyAvatar from '../components/PartyAvatar';

interface Props {
  partyId: string;
}

/** Right pane of the desktop workspace: party header, balance strip, ledger table. */
export default function LedgerPanel({ partyId }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const businessName = user?.organizationName ?? 'My Business';
  const { party, rows, balance } = usePartyLedger(partyId);
  const ctl = useLedgerController(party, rows, balance, businessName);

  if (!party) {
    return <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>This party no longer exists.</Typography>;
  }

  const willGive = balance < 0;
  const balanceColor = balance === 0 ? 'text.secondary' : willGive ? 'success.main' : 'error.main';
  const balanceLabel = balance === 0 ? 'Settled up' : willGive ? 'You will give' : 'You will get';
  const lastActivity = rows[0]?.at;
  const reminderText = party.reminderDate
    ? `Reminder · ${new Date(`${party.reminderDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
    : 'Set reminder';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Party header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <PartyAvatar name={party.name} size={48} />
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>{party.name}</Typography>
            <Chip label={party.type === 'customer' ? 'Customer' : 'Supplier'} size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
          </Box>
          <Typography variant="body2" color="text.secondary" noWrap>
            {party.phone ?? 'No mobile number'}
            {lastActivity ? ` · last entry ${timeAgo(lastActivity)}` : ' · no entries yet'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, ml: 'auto' }}>
          {party.phone && (
            <Tooltip title="Call"><IconButton component="a" href={`tel:${phoneDigits(party.phone)}`} aria-label="call"><CallOutlinedIcon /></IconButton></Tooltip>
          )}
          <Tooltip title="Download statement (PDF)"><IconButton onClick={ctl.downloadReport} aria-label="report"><PictureAsPdfOutlinedIcon /></IconButton></Tooltip>
          <Tooltip title="WhatsApp reminder"><IconButton onClick={() => ctl.openReminder('whatsapp')} aria-label="whatsapp reminder"><WhatsAppIcon /></IconButton></Tooltip>
          <Tooltip title="SMS reminder"><IconButton onClick={() => ctl.openReminder('sms')} aria-label="sms reminder"><SmsOutlinedIcon /></IconButton></Tooltip>
          <Tooltip title="Party settings"><IconButton onClick={ctl.openSettings} aria-label="settings"><SettingsOutlinedIcon /></IconButton></Tooltip>
        </Stack>
      </Box>
      <Divider />

      {/* Balance strip + primary actions */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') }}>
        <Box sx={{ minWidth: 160 }}>
          <Typography variant="body2" color="text.secondary">{balanceLabel}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: balanceColor, lineHeight: 1.2 }}>{formatKhataAmount(balance)}</Typography>
        </Box>
        <Button size="small" variant="text" startIcon={<EventRoundedIcon />} onClick={ctl.openCollection} sx={{ minHeight: 36 }}>
          {reminderText}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button variant="contained" color="error" startIcon={<RemoveRoundedIcon />} onClick={() => ctl.openNew('gave')} sx={{ minHeight: 40, px: 2 }}>
            You gave ₹
          </Button>
          <Button variant="contained" color="success" startIcon={<AddRoundedIcon />} onClick={() => ctl.openNew('got')} sx={{ minHeight: 40, px: 2 }}>
            You got ₹
          </Button>
        </Stack>
      </Box>
      <Divider />

      {/* Ledger table */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table size="small" stickyHeader sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell sx={{ width: '100%' }}>Details</TableCell>
              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>You gave</TableCell>
              <TableCell align="right" sx={{ color: 'success.main', fontWeight: 700 }}>You got</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const gave = r.type === 'gave';
              return (
                <TableRow key={r.id} hover onClick={() => ctl.openEdit(r)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography variant="body2">{formatShortDate(r.at)}</Typography>
                    {formatTime(r.at) && <Typography variant="caption" color="text.secondary">{formatTime(r.at)}</Typography>}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'normal !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{r.note}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600, bgcolor: gave ? 'rgba(226,59,59,0.06)' : undefined }}>{gave ? formatKhataAmount(r.amount) : ''}</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600, bgcolor: !gave ? 'rgba(46,158,91,0.08)' : undefined }}>{!gave ? formatKhataAmount(r.amount) : ''}</TableCell>
                  <TableCell align="right" sx={{ color: r.balanceAfter > 0 ? 'error.main' : r.balanceAfter < 0 ? 'success.main' : 'text.secondary' }}>
                    {r.balanceAfter < 0 ? '−' : ''}{formatKhataAmount(r.balanceAfter)}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  No entries yet. Sales, receipts, bills and payments for this party will appear here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {ctl.dialogs}
    </Box>
  );
}
