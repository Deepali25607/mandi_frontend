import { Box, ButtonBase, Typography } from '@mui/material';
import { KHATA } from '../khataTheme';
import type { LedgerRow } from '../types';
import { daysBetween, formatKhataAmount, formatShortDate, formatTime } from '../utils';

const AMOUNT_COL = 92;

/** Centered "20 Jan 25 • 587 days ago" divider between day groups. */
export function DateDivider({ iso, showAge = false }: { iso: string; showAge?: boolean }) {
  const days = daysBetween(new Date(iso), new Date());
  const age = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  return (
    <Typography sx={{ textAlign: 'center', fontSize: 14, color: KHATA.muted, py: 1.5 }}>
      {formatShortDate(iso)}
      {showAge && ` • ${age}`}
    </Typography>
  );
}

/** "ENTRIES | YOU GAVE | YOU GOT" column headings. */
export function LedgerColumnHeader() {
  const cell = (label: string, color: string, align: 'left' | 'right', width?: number) => (
    <Typography sx={{ width, textAlign: align, fontSize: 13, fontWeight: 600, letterSpacing: 0.6, color }}>{label}</Typography>
  );
  return (
    <Box sx={{ display: 'flex', px: 2, pb: 1, alignItems: 'center' }}>
      <Box sx={{ flex: 1 }}>{cell('ENTRIES', KHATA.muted, 'left')}</Box>
      {cell('YOU GAVE', KHATA.red, 'right', AMOUNT_COL)}
      {cell('YOU GOT', KHATA.green, 'right', AMOUNT_COL)}
    </Box>
  );
}

interface Props {
  row: LedgerRow;
  onClick: () => void;
}

/** One transaction card: timestamp, running balance pill, note, photo, amount. */
export default function LedgerEntryCard({ row, onClick }: Props) {
  const gave = row.type === 'gave';
  const balancePositive = row.balanceAfter >= 0;

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        width: 'calc(100% - 32px)',
        mx: 2,
        mb: 1.25,
        bgcolor: KHATA.surface,
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        textAlign: 'left',
        alignItems: 'stretch',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography sx={{ fontSize: 16, color: KHATA.text }}>
          {formatShortDate(row.at)}{formatTime(row.at) && ` • ${formatTime(row.at)}`}
        </Typography>
        <Box
          sx={{
            alignSelf: 'flex-start',
            px: 1,
            py: 0.25,
            borderRadius: '4px',
            fontSize: 14,
            fontWeight: 500,
            bgcolor: balancePositive ? KHATA.redPill : '#e6f4ec',
            color: balancePositive ? KHATA.red : KHATA.green,
          }}
        >
          Bal. {formatKhataAmount(row.balanceAfter)}
        </Box>
        {row.note && <Typography sx={{ fontSize: 17, color: '#4b5563', wordBreak: 'break-word' }}>{row.note}</Typography>}
      </Box>
      <Box sx={{ width: AMOUNT_COL, bgcolor: gave ? KHATA.redSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1.5 }}>
        {gave && <Typography sx={{ fontSize: 20, fontWeight: 600, color: KHATA.red }}>{formatKhataAmount(row.amount)}</Typography>}
      </Box>
      <Box sx={{ width: AMOUNT_COL, bgcolor: gave ? 'transparent' : KHATA.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1.5 }}>
        {!gave && <Typography sx={{ fontSize: 20, fontWeight: 600, color: KHATA.green }}>{formatKhataAmount(row.amount)}</Typography>}
      </Box>
    </ButtonBase>
  );
}
