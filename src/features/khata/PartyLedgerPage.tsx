import { useMediaQuery, useTheme } from '@mui/material';
import PartyLedgerMobilePage from './mobile/PartyLedgerMobilePage';
import KhataDesktopPage from './desktop/KhataDesktopPage';

/** `/parties/:partyId` — full-screen ledger on phones; on desktop the same
 *  workspace with that party selected in the detail pane. */
export default function PartyLedgerPage() {
  const isDesktop = useMediaQuery(useTheme().breakpoints.up('md'));
  return isDesktop ? <KhataDesktopPage /> : <PartyLedgerMobilePage />;
}
