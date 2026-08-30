import { Avatar } from '@mui/material';
import { KHATA } from '../khataTheme';
import { partyInitials } from '../utils';

interface Props {
  name: string;
  size?: number;
  /** Inverted style used on the blue ledger header (white disc, blue initials). */
  onBlue?: boolean;
}

export default function PartyAvatar({ name, size = 56, onBlue = false }: Props) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: onBlue ? '#fff' : KHATA.avatarBg,
        color: onBlue ? KHATA.blue : '#4b5563',
        fontWeight: 700,
        fontSize: size * 0.36,
        letterSpacing: 0.5,
      }}
    >
      {partyInitials(name)}
    </Avatar>
  );
}
