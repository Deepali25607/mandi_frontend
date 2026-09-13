import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { KHATA, KHATA_MAX_WIDTH } from '../khataTheme';

interface Props {
  /** Sticky blue header (company bar / party bar). */
  header: ReactNode;
  children: ReactNode;
  /** Sticky bar pinned to the bottom (bottom nav or YOU GAVE / YOU GOT). */
  footer?: ReactNode;
  /** Floating element rendered above the footer (e.g. ADD CUSTOMER pill). */
  fab?: ReactNode;
}

/**
 * Phone-shaped page frame for the Khata screens. Full-bleed on mobile; on
 * desktop it renders as a centred phone-width column so the layout stays a
 * faithful reproduction of the reference design at any viewport.
 */
export default function KhataScaffold({ header, children, footer, fab }: Props) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: KHATA_MAX_WIDTH,
        width: '100%',
        mx: 'auto',
        bgcolor: KHATA.bg,
        color: KHATA.text,
        boxShadow: { md: '0 0 0 1px #e5e7eb' },
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'sticky', top: 0, zIndex: 20 }}>{header}</Box>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      {fab && (
        // Floats above the bottom bar; `right` keeps it inside the phone-width
        // column when the page is centred on a wide screen.
        <Box
          sx={{
            position: 'fixed',
            bottom: footer ? 'calc(132px + env(safe-area-inset-bottom))' : 24,
            right: `max(16px, calc(50% - ${KHATA_MAX_WIDTH / 2 - 16}px))`,
            zIndex: 15,
          }}
        >
          {fab}
        </Box>
      )}
      {footer && (
        <Box sx={{ position: 'sticky', bottom: 0, zIndex: 20 }}>{footer}</Box>
      )}
    </Box>
  );
}
