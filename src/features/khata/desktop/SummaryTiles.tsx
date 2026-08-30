import { Box, Paper, Typography } from '@mui/material';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { formatKhataAmount, type PartySummary } from '../utils';

interface Props {
  label: string;
  summaries: PartySummary[];
  give: number;
  get: number;
}

/** Four compact KPI tiles for the desktop Khata header (MANDI theme colours). */
export default function SummaryTiles({ label, summaries, give, get }: Props) {
  const net = get - give;
  const today = new Date().toISOString().slice(0, 10);
  const dueReminders = summaries.filter((s) => s.party.reminderDate && s.party.reminderDate <= today && s.balance !== 0).length;
  const withBalance = summaries.filter((s) => s.balance !== 0).length;

  const tiles = [
    { title: 'You will give', value: formatKhataAmount(give), hint: 'Payable to parties', color: 'success.main', Icon: TrendingDownRoundedIcon },
    { title: 'You will get', value: formatKhataAmount(get), hint: 'Receivable from parties', color: 'error.main', Icon: TrendingUpRoundedIcon },
    { title: 'Net balance', value: `${net < 0 ? '−' : ''}${formatKhataAmount(net)}`, hint: net >= 0 ? 'Net receivable' : 'Net payable', color: net >= 0 ? 'error.main' : 'success.main', Icon: AccountBalanceWalletRoundedIcon },
    { title: `${label}s`, value: String(summaries.length), hint: `${withBalance} with balance · ${dueReminders} reminder${dueReminders === 1 ? '' : 's'} due`, color: 'primary.main', Icon: NotificationsActiveRoundedIcon },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
      {tiles.map(({ title, value, hint, color, Icon }) => (
        <Paper key={title} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color, bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }}>
            <Icon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }} noWrap>{value}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{hint}</Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
