import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import { KHATA } from '../khataTheme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  filtersActive: boolean;
  onFilters: () => void;
  onCashbook: () => void;
}

export default function PartySearchBar({ value, onChange, placeholder, filtersActive, onFilters, onCashbook }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 1.25, px: 2, py: 1.5 }}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          bgcolor: KHATA.surface,
          border: `1px solid ${KHATA.border}`,
          borderRadius: '8px',
          pl: 1.5,
          minHeight: 58,
        }}
      >
        <SearchRoundedIcon sx={{ color: KHATA.blue, fontSize: 32 }} />
        <InputBase
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          sx={{ flex: 1, ml: 1.25, fontSize: 18, color: KHATA.text, '& input::placeholder': { color: '#8a94a0', opacity: 1 } }}
          inputProps={{ 'aria-label': placeholder }}
        />
        <ButtonBase onClick={onFilters} sx={{ flexDirection: 'column', px: 1.25, alignSelf: 'stretch', color: KHATA.blue }}>
          <FilterAltOutlinedIcon sx={{ fontSize: 28 }} />
          <Typography sx={{ fontSize: 11, fontWeight: filtersActive ? 700 : 500 }}>Filters{filtersActive ? ' •' : ''}</Typography>
        </ButtonBase>
      </Box>
      <ButtonBase
        onClick={onCashbook}
        sx={{
          px: 1.5,
          minWidth: 132,
          border: `1.5px solid ${KHATA.blue}`,
          borderRadius: '8px',
          bgcolor: KHATA.surface,
          color: KHATA.blue,
          gap: 0.75,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <BookOutlinedIcon sx={{ fontSize: 22 }} />
        Cashbook
      </ButtonBase>
    </Box>
  );
}
