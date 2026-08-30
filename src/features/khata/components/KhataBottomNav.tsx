import { Box, ButtonBase, Typography } from '@mui/material';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import { KHATA } from '../khataTheme';

export type KhataTab = 'parties' | 'loans' | 'more';

interface Props {
  active: KhataTab;
  onSelect: (tab: KhataTab) => void;
}

/** Parties · Loans · More — the three-tab bar under the party dashboard. */
export default function KhataBottomNav({ active, onSelect }: Props) {
  const tab = (key: KhataTab, label: string, icon: React.ReactNode) => {
    const isActive = active === key;
    return (
      <ButtonBase
        onClick={() => onSelect(key)}
        sx={{ flex: 1, flexDirection: 'column', gap: 0.5, py: 1.25, position: 'relative', color: isActive ? KHATA.blue : '#3f4a55' }}
      >
        {isActive && <Box sx={{ position: 'absolute', top: 0, width: 96, height: 4, borderRadius: '0 0 4px 4px', bgcolor: KHATA.blue }} />}
        {icon}
        <Typography sx={{ fontSize: 17, fontWeight: isActive ? 700 : 500 }}>{label}</Typography>
      </ButtonBase>
    );
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: KHATA.surface, borderTop: `1px solid ${KHATA.border}`, pb: 'env(safe-area-inset-bottom)' }}>
      {tab('parties', 'Parties', <PeopleOutlineRoundedIcon sx={{ fontSize: 34 }} />)}
      {tab(
        'loans',
        'Loans',
        <Box
          sx={{
            width: 96,
            height: 96,
            mt: -6,
            borderRadius: '50%',
            bgcolor: KHATA.blue,
            border: '4px solid #fff',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.1,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Up to</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: KHATA.tabAccent }}>₹5 LAKH</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Loan</Typography>
        </Box>,
      )}
      {tab('more', 'More', <MoreHorizRoundedIcon sx={{ fontSize: 34, border: '2px solid currentColor', borderRadius: '8px', p: '2px' }} />)}
    </Box>
  );
}
