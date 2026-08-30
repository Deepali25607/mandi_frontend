import { useMemo, useState } from 'react';
import { Box, CircularProgress, Dialog, IconButton, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useGetCashBookQuery } from '@/api/financeApi';
import { KHATA } from '../khataTheme';
import { formatKhataAmount, formatShortDate } from '../utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Cashbook: the ERP's cash / bank book (collections in, supplier payments and
 * expenses out, internal transfers), newest first, with the running balance.
 */
export default function CashbookDialog({ open, onClose }: Props) {
  const isDesktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const [kind, setKind] = useState<'cash' | 'bank'>('cash');
  const { data, isLoading } = useGetCashBookQuery(kind, { skip: !open });
  const rows = useMemo(() => [...(data?.rows ?? [])].reverse(), [data]);
  const totalIn = rows.reduce((s, r) => s + r.inflow, 0);
  const totalOut = rows.reduce((s, r) => s + r.outflow, 0);

  return (
    <Dialog open={open} onClose={onClose} fullScreen={!isDesktop} maxWidth="sm" fullWidth PaperProps={{ sx: { maxWidth: isDesktop ? 640 : 480, mx: 'auto', bgcolor: KHATA.bg, height: isDesktop ? '80vh' : undefined } }}>
      <Box sx={{ bgcolor: KHATA.blue, color: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1, pt: 1, gap: 1 }}>
          <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="back">
            <ArrowBackRoundedIcon sx={{ fontSize: 30 }} />
          </IconButton>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Cashbook</Typography>
        </Box>
        <Tabs value={kind} onChange={(_, v: 'cash' | 'bank') => setKind(v)} textColor="inherit" sx={{ px: 1, '& .MuiTabs-indicator': { bgcolor: KHATA.tabAccent, height: 4 }, '& .MuiTab-root': { fontWeight: 700, color: 'rgba(255,255,255,0.75)', '&.Mui-selected': { color: '#fff' } } }}>
          <Tab value="cash" label="CASH" />
          <Tab value="bank" label="BANK" />
        </Tabs>
      </Box>
      <Box sx={{ m: 2, borderRadius: '10px', bgcolor: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', py: 1.75, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
        <Box sx={{ textAlign: 'center', borderRight: `1px solid ${KHATA.border}` }}>
          <Typography sx={{ fontSize: 14, color: '#3f4a55' }}>In</Typography>
          <Typography sx={{ fontSize: 19, fontWeight: 700, color: KHATA.green }}>{formatKhataAmount(totalIn)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', borderRight: `1px solid ${KHATA.border}` }}>
          <Typography sx={{ fontSize: 14, color: '#3f4a55' }}>Out</Typography>
          <Typography sx={{ fontSize: 19, fontWeight: 700, color: KHATA.red }}>{formatKhataAmount(totalOut)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: '#3f4a55' }}>Balance</Typography>
          <Typography sx={{ fontSize: 19, fontWeight: 700, color: KHATA.blue }}>{formatKhataAmount(data?.balance ?? 0)}</Typography>
        </Box>
      </Box>
      {isLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress size={28} /></Box>}
      {rows.map((r, i) => {
        const out = r.outflow > 0;
        return (
          <Box key={`${r.voucher}-${i}`} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, bgcolor: '#fff', borderBottom: `1px solid ${KHATA.border}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 16 }}>{r.particulars}</Typography>
              <Typography sx={{ fontSize: 13, color: KHATA.muted }}>
                {formatShortDate(r.date)}{r.voucher ? ` • ${r.voucher}` : ''} • Bal. {formatKhataAmount(r.balance)}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 17, fontWeight: 600, color: out ? KHATA.red : KHATA.green }}>
              {out ? '−' : '+'} {formatKhataAmount(out ? r.outflow : r.inflow)}
            </Typography>
          </Box>
        );
      })}
      {!isLoading && rows.length === 0 && <Typography sx={{ textAlign: 'center', color: KHATA.muted, mt: 6 }}>No {kind} entries yet.</Typography>}
    </Dialog>
  );
}
