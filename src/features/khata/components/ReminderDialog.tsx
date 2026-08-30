import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { KHATA } from '../khataTheme';
import type { Party } from '../types';
import { formatKhataAmount, phoneDigits } from '../utils';

export type ReminderChannel = 'whatsapp' | 'sms';

interface Props {
  open: boolean;
  party: Party | null;
  balance: number;
  businessName: string;
  /** Preferred channel; both are always offered. */
  channel: ReminderChannel;
  onClose: () => void;
  onSent?: (channel: ReminderChannel) => void;
}

export function reminderMessage(party: Party, balance: number, businessName: string): string {
  if (balance > 0) {
    return `Namaste ${party.name}, this is a payment reminder from ${businessName}. Your pending balance is ${formatKhataAmount(balance)}. Please pay at the earliest. Thank you.`;
  }
  if (balance < 0) {
    return `Namaste ${party.name}, ${businessName} has ${formatKhataAmount(balance)} pending to pay you. We will settle it soon. Thank you.`;
  }
  return `Namaste ${party.name}, your account with ${businessName} is fully settled. Thank you for your business.`;
}

/** Composes a payment reminder and opens WhatsApp / SMS with it pre-filled. */
export default function ReminderDialog({ open, party, balance, businessName, channel, onClose, onSent }: Props) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open && party) setText(reminderMessage(party, balance, businessName));
  }, [open, party, balance, businessName]);

  if (!party) return null;
  const digits = phoneDigits(party.phone);
  const encoded = encodeURIComponent(text);

  const send = (via: ReminderChannel) => {
    const url = via === 'whatsapp' ? `https://wa.me/${digits}?text=${encoded}` : `sms:${digits}?body=${encoded}`;
    window.open(url, '_blank', 'noopener');
    onSent?.(via);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 700, color: KHATA.blue }}>Send reminder to {party.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography sx={{ color: KHATA.muted, fontSize: 14 }}>
            {party.phone ? `Mobile: ${party.phone}` : 'No mobile number saved — add one from View settings to send directly.'}
          </Typography>
          <TextField multiline minRows={4} value={text} onChange={(e) => setText(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => navigator.clipboard?.writeText(text)} sx={{ color: KHATA.muted, mr: 'auto' }}>
          Copy
        </Button>
        <Button variant={channel === 'sms' ? 'contained' : 'outlined'} startIcon={<SmsOutlinedIcon />} onClick={() => send('sms')} disabled={!digits} sx={{ color: channel === 'sms' ? '#fff' : KHATA.blue, borderColor: KHATA.blue, bgcolor: channel === 'sms' ? KHATA.blue : undefined }}>
          SMS
        </Button>
        <Button variant={channel === 'whatsapp' ? 'contained' : 'outlined'} startIcon={<WhatsAppIcon />} onClick={() => send('whatsapp')} sx={{ bgcolor: channel === 'whatsapp' ? '#25d366' : undefined, color: channel === 'whatsapp' ? '#fff' : '#128c7e', borderColor: '#25d366', '&:hover': { bgcolor: channel === 'whatsapp' ? '#1ebe5b' : undefined } }}>
          WhatsApp
        </Button>
      </DialogActions>
    </Dialog>
  );
}
