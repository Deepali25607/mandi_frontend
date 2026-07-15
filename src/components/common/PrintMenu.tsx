import { ListItemText, Menu, MenuItem } from '@mui/material';
import { useGetPrinterProfilesQuery } from '@/api/adminApi';
import { PRINT_SIZES, THERMAL_PRESETS, type PaperSpec } from '@/utils/invoice';

/**
 * Print targets for an invoice: every printer configured under Admin → Printers,
 * plus PDF. Falls back to the built-in 2"/3"/4" presets if the list can't be
 * loaded (e.g. an older backend), so printing never breaks.
 */
export default function PrintMenu({
  anchorEl, onClose, onPick,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** `paper` is null for the PDF option. */
  onPick: (paper: PaperSpec | null) => void;
}) {
  const { data: printers, isError } = useGetPrinterProfilesQuery();
  const usable = (printers ?? []).filter((p) => p.isActive);
  // Default printer first, then narrowest → widest.
  const sorted = [...usable].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.widthMm - b.widthMm);
  const fallback = isError || usable.length === 0;

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      {fallback
        ? PRINT_SIZES.filter((s) => s.value !== 'pdf').map((s) => (
            <MenuItem key={s.value} onClick={() => onPick(THERMAL_PRESETS[s.value as '2in' | '3in' | '4in'])}>
              <ListItemText
                primary={s.label}
                secondary={s.hint}
                primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
              />
            </MenuItem>
          ))
        : sorted.map((p) => (
            <MenuItem key={p.id} onClick={() => onPick({ widthMm: p.widthMm, fontSize: p.fontSize, marginMm: p.marginMm })}>
              <ListItemText
                primary={p.isDefault ? `${p.name} ★` : p.name}
                secondary={`${p.widthMm}mm roll`}
                primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
              />
            </MenuItem>
          ))}
      <MenuItem onClick={() => onPick(null)}>
        <ListItemText
          primary="PDF (A4)"
          secondary="Download / share"
          primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
        />
      </MenuItem>
    </Menu>
  );
}
