import { useMediaQuery, useTheme } from '@mui/material';
import PartiesMobilePage from './mobile/PartiesMobilePage';
import KhataDesktopPage from './desktop/KhataDesktopPage';

/** `/parties` — Khatabook-style app on phones, master–detail workspace on desktop. */
export default function PartiesPage() {
  const isDesktop = useMediaQuery(useTheme().breakpoints.up('md'));
  return isDesktop ? <KhataDesktopPage /> : <PartiesMobilePage />;
}
