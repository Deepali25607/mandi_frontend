import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, LinearProgress, Paper, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useAppSelector } from '@/store/hooks';
import { useKhataParties, usePartySummaries } from '../hooks';
import { usePartyCreator } from '../usePartyCreator';
import type { PartyType } from '../types';
import { totals, type PartySummary } from '../utils';
import { downloadPartiesReportPdf } from '../ledgerPdf';
import { DEFAULT_FILTERS, type PartyFilters } from '../components/FilterSheet';
import PartyFormDialog from '../components/PartyFormDialog';
import ReminderDialog from '../components/ReminderDialog';
import CashbookDialog from '../components/CashbookDialog';
import SummaryTiles from './SummaryTiles';
import PartyListPanel from './PartyListPanel';
import LedgerPanel from './LedgerPanel';

export function applyFilters(list: PartySummary[], query: string, f: PartyFilters): PartySummary[] {
  const q = query.trim().toLowerCase();
  let out = list.filter((s) => {
    if (q && !s.party.name.toLowerCase().includes(q) && !(s.party.phone ?? '').includes(q) && !s.party.code.toLowerCase().includes(q)) return false;
    if (f.balance === 'get') return s.balance > 0;
    if (f.balance === 'give') return s.balance < 0;
    if (f.balance === 'settled') return s.balance === 0;
    return true;
  });
  if (f.sort === 'name') out = [...out].sort((a, b) => a.party.name.localeCompare(b.party.name));
  if (f.sort === 'amount') out = [...out].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  return out;
}

/**
 * Desktop Khata workspace: KPI tiles on top, party list on the left and the
 * selected party's ledger on the right. The URL (`/parties/:partyId`) carries
 * the selection so links from the phone layout keep working.
 */
export default function KhataDesktopPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const businessName = user?.organizationName ?? 'My Business';

  const { parties: allParties } = useKhataParties();
  const selectedParty = allParties.find((p) => p.id === partyId);

  // The tab lives in the URL (`?tab=supplier`) because /parties and
  // /parties/:partyId are separate routes and would otherwise reset local state.
  const [searchParams] = useSearchParams();
  const tab: PartyType = selectedParty?.type ?? (searchParams.get('tab') === 'supplier' ? 'supplier' : 'customer');
  const setTab = (t: PartyType) => navigate(t === 'supplier' ? '/parties?tab=supplier' : '/parties');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PartyFilters>(DEFAULT_FILTERS);
  const [addOpen, setAddOpen] = useState(false);
  const [cashbookOpen, setCashbookOpen] = useState(false);
  const [remind, setRemind] = useState<PartySummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { summaries, isLoading } = usePartySummaries(tab);
  const { give, get } = useMemo(() => totals(summaries), [summaries]);
  const visible = useMemo(() => applyFilters(summaries, query, filters), [summaries, query, filters]);
  const label = tab === 'customer' ? 'Customer' : 'Supplier';

  const creator = usePartyCreator((id, draft) => {
    setAddOpen(false);
    setToast(`${draft.name} added`);
    navigate(`/parties/${id}`);
  });

  return (
    <Stack spacing={2} sx={{ height: 'calc(100dvh - 64px - 48px)', minHeight: 560 }}>
      {/* Title row: tabs + global actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Tabs value={tab} onChange={(_, v: PartyType) => { setTab(v); setQuery(''); }} sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 700 } }}>
          <Tab value="customer" label="Customers" />
          <Tab value="supplier" label="Suppliers" />
        </Tabs>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => downloadPartiesReportPdf(businessName, label, summaries, give, get)} sx={{ minHeight: 40 }}>
          Report
        </Button>
        <Button variant="outlined" startIcon={<BookOutlinedIcon />} onClick={() => setCashbookOpen(true)} sx={{ minHeight: 40 }}>
          Cashbook
        </Button>
        <Button variant="contained" startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => { creator.clearError(); setAddOpen(true); }} sx={{ minHeight: 40 }}>
          Add {label}
        </Button>
      </Box>

      <SummaryTiles label={label} summaries={summaries} give={give} get={get} />

      {/* Master–detail */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { md: '300px 1fr', lg: '380px 1fr' }, gap: 2, flex: 1, minHeight: 0 }}>
        <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 0 }}>
          {isLoading && <LinearProgress />}
          <PartyListPanel
            label={label}
            items={visible}
            total={summaries.length}
            selectedId={partyId}
            query={query}
            onQuery={setQuery}
            filters={filters}
            onFilters={setFilters}
            onSelect={(id) => navigate(`/parties/${id}`)}
            onRemind={setRemind}
          />
        </Paper>
        <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 0 }}>
          {partyId ? (
            <LedgerPanel key={partyId} partyId={partyId} />
          ) : (
            <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', p: 4 }}>
              <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
                <MenuBookRoundedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>Select a {label.toLowerCase()}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Pick a party on the left to see their ledger, record receipts or payments, send reminders or download a statement.
                </Typography>
                <Button variant="contained" startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => { creator.clearError(); setAddOpen(true); }} sx={{ mt: 2.5 }}>
                  Add {label}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <PartyFormDialog open={addOpen} type={tab} saving={creator.saving} error={creator.error} onClose={() => setAddOpen(false)} onSave={creator.create} />
      <CashbookDialog open={cashbookOpen} onClose={() => setCashbookOpen(false)} />
      <ReminderDialog
        open={Boolean(remind)}
        party={remind?.party ?? null}
        balance={remind?.balance ?? 0}
        businessName={businessName}
        channel="whatsapp"
        onClose={() => setRemind(null)}
        onSent={() => setToast('Reminder opened in your messaging app.')}
      />
      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}
