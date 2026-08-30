import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, Divider, LinearProgress, List, ListItemButton, ListItemText, Menu, MenuItem, Snackbar, Typography } from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import { useAppSelector } from '@/store/hooks';
import { KHATA } from '../khataTheme';
import { usePartySummaries } from '../hooks';
import { usePartyCreator } from '../usePartyCreator';
import type { PartyType } from '../types';
import { totals, type PartySummary } from '../utils';
import { downloadPartiesReportPdf } from '../ledgerPdf';
import { applyFilters } from '../desktop/KhataDesktopPage';
import KhataScaffold from '../components/KhataScaffold';
import BalanceSummaryCard from '../components/BalanceSummaryCard';
import PartySearchBar from '../components/PartySearchBar';
import PartyRow from '../components/PartyRow';
import KhataBottomNav, { type KhataTab } from '../components/KhataBottomNav';
import FilterSheet, { DEFAULT_FILTERS, type PartyFilters } from '../components/FilterSheet';
import PartyFormDialog from '../components/PartyFormDialog';
import ReminderDialog from '../components/ReminderDialog';
import CashbookDialog from '../components/CashbookDialog';

const TABS: { key: PartyType; label: string }[] = [
  { key: 'customer', label: 'CUSTOMERS' },
  { key: 'supplier', label: 'SUPPLIERS' },
];

const MORE_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Collections', path: '/collections' },
  { label: 'Outstanding', path: '/outstanding' },
  { label: 'Reports', path: '/reports' },
  { label: 'Customers master', path: '/customers' },
  { label: 'Suppliers master', path: '/suppliers' },
];

/** Party dashboard — the Khata home (phone layout): totals, search, customer/supplier list. */
export default function PartiesMobilePage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const businessName = user?.organizationName ?? 'My Business';

  const [searchParams] = useSearchParams();
  const tab: PartyType = searchParams.get('tab') === 'supplier' ? 'supplier' : 'customer';
  const setTab = (t: PartyType) => navigate(t === 'supplier' ? '/parties?tab=supplier' : '/parties', { replace: true });
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PartyFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cashbookOpen, setCashbookOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [remind, setRemind] = useState<PartySummary | null>(null);
  const [orgMenuEl, setOrgMenuEl] = useState<null | HTMLElement>(null);
  const [coinsOpen, setCoinsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { summaries, isLoading } = usePartySummaries(tab);
  const { give, get } = useMemo(() => totals(summaries), [summaries]);
  const visible = useMemo(() => applyFilters(summaries, query, filters), [summaries, query, filters]);
  const filtersActive = filters.sort !== DEFAULT_FILTERS.sort || filters.balance !== DEFAULT_FILTERS.balance;
  const label = tab === 'customer' ? 'Customer' : 'Supplier';

  const creator = usePartyCreator((id) => {
    setAddOpen(false);
    navigate(`/parties/${id}`);
  });

  const onBottomNav = (t: KhataTab) => {
    if (t === 'loans') setToast('Loans are not available for your account yet.');
    else if (t === 'more') setMoreOpen(true);
  };

  const header = (
    <Box sx={{ bgcolor: KHATA.blue, color: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 2.5, pb: 1.5, gap: 1.5 }}>
        <MenuBookOutlinedIcon sx={{ fontSize: 32 }} />
        <ButtonBase onClick={(e) => setOrgMenuEl(e.currentTarget)} sx={{ gap: 0.5, flex: 1, justifyContent: 'flex-start', minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 20, fontWeight: 700 }}>{businessName}</Typography>
          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 28 }} />
        </ButtonBase>
        <ButtonBase
          onClick={() => setCoinsOpen(true)}
          sx={{ border: `2px solid ${KHATA.tabAccent}`, borderRadius: 999, px: 1.25, py: 0.5, gap: 0.75, fontSize: 16, fontWeight: 600, position: 'relative' }}
        >
          <MonetizationOnRoundedIcon sx={{ color: KHATA.tabAccent, fontSize: 24 }} />
          0
          <Box sx={{ position: 'absolute', top: -6, right: -2, width: 16, height: 16, borderRadius: '50%', bgcolor: '#e0466a', border: '2px solid #fff' }} />
        </ButtonBase>
      </Box>
      <Box sx={{ display: 'flex', px: 2 }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <ButtonBase
              key={t.key}
              onClick={() => { setTab(t.key); setQuery(''); }}
              sx={{ px: 1.5, pb: 1.25, mr: 3, fontSize: 17, fontWeight: 700, letterSpacing: 0.3, color: active ? '#fff' : 'rgba(255,255,255,0.75)', position: 'relative' }}
            >
              {t.label}
              {active && <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, borderRadius: '4px 4px 0 0', bgcolor: KHATA.tabAccent }} />}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <KhataScaffold
      header={header}
      footer={<KhataBottomNav active="parties" onSelect={onBottomNav} />}
      fab={
        <ButtonBase
          onClick={() => { creator.clearError(); setAddOpen(true); }}
          sx={{ bgcolor: KHATA.magenta, color: '#fff', borderRadius: 999, px: 3, py: 2, gap: 1.5, fontSize: 18, fontWeight: 700, letterSpacing: 1.2, boxShadow: '0 4px 12px rgba(176,22,90,0.4)' }}
        >
          <PersonAddAlt1RoundedIcon sx={{ fontSize: 28 }} />
          ADD {label.toUpperCase()}
        </ButtonBase>
      }
    >
      {/* Blue background bleeds behind the top half of the summary card. */}
      <Box sx={{ bgcolor: KHATA.blue, pt: 1, pb: 2 }}>
        <BalanceSummaryCard give={give} get={get} onViewReports={() => downloadPartiesReportPdf(businessName, label, summaries, give, get)} />
      </Box>

      <PartySearchBar
        value={query}
        onChange={setQuery}
        placeholder={`Search ${label}`}
        filtersActive={filtersActive}
        onFilters={() => setFiltersOpen(true)}
        onCashbook={() => setCashbookOpen(true)}
      />

      {isLoading && <LinearProgress />}
      <Box sx={{ pb: 3 }}>
        {visible.map((s) => (
          <PartyRow key={s.party.id} summary={s} onOpen={() => navigate(`/parties/${s.party.id}`)} onRemind={() => setRemind(s)} />
        ))}
        {!isLoading && visible.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: KHATA.muted, py: 6, px: 3 }}>
            {summaries.length === 0 ? `No ${label.toLowerCase()}s yet. Tap "ADD ${label.toUpperCase()}" to create one.` : `No ${label.toLowerCase()} matches your search.`}
          </Typography>
        )}
      </Box>

      {/* Company switcher (single org in this build). */}
      <Menu anchorEl={orgMenuEl} open={Boolean(orgMenuEl)} onClose={() => setOrgMenuEl(null)}>
        <MenuItem selected onClick={() => setOrgMenuEl(null)}>{businessName}</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setOrgMenuEl(null); navigate('/organization'); }}>Business settings</MenuItem>
      </Menu>

      <Dialog open={coinsOpen} onClose={() => setCoinsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reward coins</DialogTitle>
        <DialogContent>
          <Typography>You have 0 coins. Earn coins by recording receipts daily and sending reminders on time.</Typography>
        </DialogContent>
      </Dialog>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>More</DialogTitle>
        <List disablePadding>
          {MORE_LINKS.map((l) => (
            <ListItemButton key={l.path} onClick={() => { setMoreOpen(false); navigate(l.path); }}>
              <ListItemText primary={l.label} />
            </ListItemButton>
          ))}
        </List>
      </Dialog>

      <FilterSheet open={filtersOpen} value={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} />
      <CashbookDialog open={cashbookOpen} onClose={() => setCashbookOpen(false)} />
      <PartyFormDialog open={addOpen} type={tab} saving={creator.saving} error={creator.error} onClose={() => setAddOpen(false)} onSave={creator.create} />
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
    </KhataScaffold>
  );
}
