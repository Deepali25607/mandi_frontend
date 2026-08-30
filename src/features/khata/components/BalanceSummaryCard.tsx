import { Box, ButtonBase, Typography } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { KHATA } from '../khataTheme';
import { formatKhataAmount } from '../utils';

interface Props {
  give: number;
  get: number;
  onViewReports: () => void;
}

/** "You will give | You will get" card with the View Reports strip (dashboard). */
export default function BalanceSummaryCard({ give, get, onViewReports }: Props) {
  return (
    <Box sx={{ mx: 2, borderRadius: '10px', overflow: 'hidden', bgcolor: KHATA.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', py: 1.75, position: 'relative' }}>
        <Box sx={{ position: 'absolute', left: '50%', top: 14, bottom: 14, width: '1px', bgcolor: KHATA.border }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 16, color: '#3f4a55' }}>You will give</Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: KHATA.green, mt: 0.25 }}>{formatKhataAmount(give)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 16, color: '#3f4a55' }}>You will get</Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: KHATA.red, mt: 0.25 }}>{formatKhataAmount(get)}</Typography>
        </Box>
      </Box>
      <ButtonBase
        onClick={onViewReports}
        sx={{ width: '100%', py: 1.5, bgcolor: KHATA.reportStrip, gap: 1, color: KHATA.blue, fontSize: 18, fontWeight: 700 }}
      >
        <PictureAsPdfOutlinedIcon sx={{ fontSize: 24 }} />
        View Reports
      </ButtonBase>
    </Box>
  );
}
