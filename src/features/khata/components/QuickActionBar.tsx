import { Box, ButtonBase, Typography } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import { KHATA } from '../khataTheme';

interface Props {
  onReport: () => void;
  onReminder: () => void;
  onSms: () => void;
}

/** Report · Reminder · SMS — the sticky action strip under the ledger header. */
export default function QuickActionBar({ onReport, onReminder, onSms }: Props) {
  const action = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <ButtonBase onClick={onClick} sx={{ flex: 1, flexDirection: 'column', gap: 0.75, py: 1.75, color: KHATA.blue }}>
      {icon}
      <Typography sx={{ fontSize: 17, fontWeight: 500 }}>{label}</Typography>
    </ButtonBase>
  );
  return (
    <Box sx={{ display: 'flex', bgcolor: KHATA.surface, borderBottom: `1px solid ${KHATA.border}` }}>
      {action('Report', <PictureAsPdfOutlinedIcon sx={{ fontSize: 36 }} />, onReport)}
      {action('Reminder', <WhatsAppIcon sx={{ fontSize: 36 }} />, onReminder)}
      {action('SMS', <SmsOutlinedIcon sx={{ fontSize: 36 }} />, onSms)}
    </Box>
  );
}
