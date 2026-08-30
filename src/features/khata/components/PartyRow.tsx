import { Box, ButtonBase, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { KHATA } from '../khataTheme';
import { formatKhataAmount, timeAgo, type PartySummary } from '../utils';
import PartyAvatar from './PartyAvatar';

interface Props {
  summary: PartySummary;
  onOpen: () => void;
  onRemind: () => void;
}

/** One row of the party list: avatar, name, age, and the tinted amount column. */
export default function PartyRow({ summary, onOpen, onRemind }: Props) {
  const { party, balance, lastActivity } = summary;
  const willGet = balance > 0;
  const willGive = balance < 0;
  const tint = willGet ? KHATA.redSoft : willGive ? KHATA.greenSoft : KHATA.surface;
  const color = willGet ? KHATA.red : willGive ? KHATA.green : KHATA.text;

  return (
    <Box sx={{ display: 'flex', bgcolor: KHATA.surface, borderBottom: `1px solid ${KHATA.border}` }}>
      <ButtonBase onClick={onOpen} sx={{ flex: 1, justifyContent: 'flex-start', gap: 2, px: 2, py: 2, textAlign: 'left' }}>
        <PartyAvatar name={party.name} size={52} />
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 18, color: KHATA.text, lineHeight: 1.3 }}>{party.name}</Typography>
          <Typography sx={{ fontSize: 15, color: KHATA.muted }}>{lastActivity ? timeAgo(lastActivity) : 'No entries yet'}</Typography>
        </Box>
      </ButtonBase>
      <ButtonBase
        onClick={balance !== 0 ? onRemind : onOpen}
        sx={{ width: 138, bgcolor: tint, flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', pr: 2, gap: 0.25 }}
      >
        <Typography sx={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1.2 }}>{formatKhataAmount(balance)}</Typography>
        {balance !== 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: KHATA.blue }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>REMIND</Typography>
            <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
          </Box>
        )}
      </ButtonBase>
    </Box>
  );
}
