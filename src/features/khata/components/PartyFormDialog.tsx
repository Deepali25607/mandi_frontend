import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import { KHATA } from '../khataTheme';
import type { Party, PartyType } from '../types';

export interface PartyDraft {
  name: string;
  phone?: string;
  type: PartyType;
  openingBalance?: number;
}

interface Props {
  open: boolean;
  /** Default type for a new party. */
  type: PartyType;
  /** Existing party → edit mode ("View settings"). */
  party?: Party | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (draft: PartyDraft) => void;
  /** Archive (soft-delete) the party in the masters. */
  onDelete?: () => void;
}

/** Add customer/supplier (creates the real master record), or edit name/mobile. */
export default function PartyFormDialog({ open, type, party, saving = false, error, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partyType, setPartyType] = useState<PartyType>(type);
  const [opening, setOpening] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(party?.name ?? '');
    setPhone(party?.phone ?? '');
    setPartyType(party?.type ?? type);
    setOpening('');
  }, [open, party, type]);

  const valid = name.trim().length > 0 && (opening === '' || Number.isFinite(Number(opening)));
  const label = partyType === 'customer' ? 'Customer' : 'Supplier';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 700, color: KHATA.blue }}>{party ? `${label} settings` : `Add ${label}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus label={`${label} name`} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField label="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXX XXXXX" inputProps={{ inputMode: 'tel' }} fullWidth />
          {party ? (
            <Typography sx={{ fontSize: 13, color: KHATA.muted }}>
              Code {party.code}. Full details (area, GST, credit limit, bank) are edited in the {label}s master.
            </Typography>
          ) : (
            <>
              <TextField select label="Party type" value={partyType} onChange={(e) => setPartyType(e.target.value as PartyType)} fullWidth>
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="supplier">Supplier</MenuItem>
              </TextField>
              <TextField
                label={partyType === 'customer' ? 'Opening balance (they owe you)' : 'Opening balance (you owe them)'}
                type="number"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                inputProps={{ step: 'any', inputMode: 'decimal' }}
                fullWidth
              />
            </>
          )}
          {error && <Typography sx={{ color: KHATA.red, fontSize: 14 }}>{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {party && onDelete && (
          <Button color="error" startIcon={<ArchiveOutlinedIcon />} onClick={onDelete} disabled={saving} sx={{ mr: 'auto' }}>
            Archive
          </Button>
        )}
        <Button onClick={onClose} disabled={saving} sx={{ color: KHATA.muted }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!valid || saving}
          onClick={() => onSave({ name: name.trim(), phone: phone.trim() || undefined, type: partyType, openingBalance: opening === '' ? undefined : Number(opening) })}
          sx={{ bgcolor: KHATA.blue, '&:hover': { bgcolor: KHATA.blueDark } }}
        >
          {saving ? 'Saving…' : party ? 'Save' : `Add ${label}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
