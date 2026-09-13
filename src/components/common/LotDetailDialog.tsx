import { useMemo } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useGetArrivalsQuery, useGetSalesQuery } from '@/api/operationsApi';
import { useGetSupplierBillsQuery } from '@/api/financeApi';
import { useAppSelector } from '@/store/hooks';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { StockLot } from '@/types/domain';

interface Props {
  lot: StockLot | null;
  onClose: () => void;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * One place to see everything about a stock lot: where it came from, how much
 * is left, every sale drawn from it and which settlement bills cover it.
 * Reused by Inventory (By Lot) and by the lot-carrying reports.
 */
export default function LotDetailDialog({ lot, onClose }: Props) {
  const isAdmin = useAppSelector((s) => s.auth.user?.role) === 'org_admin';
  const { itemName, supplierName, customerName } = useLookups();
  const { data: sales } = useGetSalesQuery(undefined, { skip: !lot });
  const { data: arrivals } = useGetArrivalsQuery(undefined, { skip: !lot });
  const { data: bills } = useGetSupplierBillsQuery(undefined, { skip: !lot });

  const arrival = useMemo(() => (lot ? arrivals?.find((a) => a.id === lot.arrivalId) : undefined), [arrivals, lot]);
  const saleRows = useMemo(() => {
    if (!lot) return [];
    return (sales ?? [])
      .flatMap((s) => (s.lines ?? []).filter((l) => l.lotId === lot.id).map((l) => ({ sale: s, line: l })))
      .sort((a, b) => b.sale.date.localeCompare(a.sale.date));
  }, [sales, lot]);
  const lotBills = useMemo(() => (lot ? (bills ?? []).filter((b) => b.lotId === lot.id) : []), [bills, lot]);

  if (!lot) return null;

  const soldQty = r2(lot.qtyArrived - lot.qtyAvailable);
  const soldWeight = r2(lot.weightArrived - lot.weightAvailable);
  const pctLeft = lot.weightArrived > 0 ? Math.round((lot.weightAvailable / lot.weightArrived) * 100) : 0;
  const salesWeight = saleRows.reduce((s, r) => s + r.line.weight, 0);
  const salesGross = saleRows.reduce((s, r) => s + r.line.grossAmount, 0);
  const salesSupplier = saleRows.reduce((s, r) => s + (r.line.supplierGrossAmount ?? r.line.grossAmount), 0);
  const avgSaleRate = salesWeight > 0 ? salesGross / salesWeight : 0;
  const margin = salesGross - salesSupplier;
  const purchaseType = lot.purchaseType === 'commission' ? 'Commission' : 'Bilty';

  const stat = (label: string, value: string, accent?: 'success' | 'warning' | 'error') => (
    <Paper key={label} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.04em' }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, color: accent ? `${accent}.main` : 'text.primary' }} noWrap>{value}</Typography>
    </Paper>
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          Lot {lot.lotNumber}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
            {itemName(lot.itemId)} · {supplierName(lot.supplierId)} · {purchaseType} · received {lot.date}
            {arrival ? ` · ${arrival.arrivalNumber}` : ''}
          </Typography>
        </Box>
        <Chip size="small" label={lot.status === 'closed' ? 'Sold out' : 'Active'} color={lot.status === 'closed' ? 'default' : 'success'} sx={{ fontWeight: 700 }} />
        <IconButton onClick={onClose} size="small" aria-label="close"><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' } }}>
            {stat('Received', `${formatNumber(lot.qtyArrived)} bags · ${formatNumber(lot.weightArrived)} kg`)}
            {stat('Sold', `${formatNumber(soldQty)} bags · ${formatNumber(soldWeight)} kg`)}
            {stat('Remaining', `${formatNumber(lot.qtyAvailable)} bags · ${formatNumber(lot.weightAvailable)} kg`, lot.weightAvailable > 0 ? 'success' : undefined)}
            {stat('Purchase rate', `${formatCurrency(lot.rate, false)}/kg`)}
            {stat('Stock value', formatCurrency(lot.weightAvailable * lot.rate, false))}
            {stat('Avg. sale rate', salesWeight > 0 ? `${formatCurrency(avgSaleRate, false)}/kg` : '—')}
            {stat('Sales value', formatCurrency(salesGross, false))}
            {isAdmin
              ? stat('Margin (dual rate)', formatCurrency(margin, false), margin > 0 ? 'success' : margin < 0 ? 'error' : undefined)
              : stat('Sales lines', String(saleRows.length))}
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Stock remaining</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{pctLeft}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={pctLeft} sx={{ height: 8, borderRadius: 1 }} />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Related sales ({saleRows.length})</Typography>
            {saleRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Nothing sold from this lot yet.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Weight</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      {isAdmin && <TableCell align="right">Supp. rate</TableCell>}
                      <TableCell align="right">Gross</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {saleRows.map(({ sale, line }) => (
                      <TableRow key={line.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{sale.date}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{sale.saleNumber}</TableCell>
                        <TableCell>{customerName(sale.customerId)}</TableCell>
                        <TableCell align="right">{formatNumber(line.quantity)}</TableCell>
                        <TableCell align="right">{formatNumber(line.weight)} kg</TableCell>
                        <TableCell align="right">{formatCurrency(line.rate, false)}</TableCell>
                        {isAdmin && <TableCell align="right">{formatCurrency(line.supplierRate ?? line.rate, false)}</TableCell>}
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(line.grossAmount, false)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>

          {lotBills.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Settlement bills covering this lot</Typography>
              <Stack spacing={0.5}>
                {lotBills.map((b) => (
                  <Typography key={b.id} variant="body2" color="text.secondary">
                    {b.billNumber} · {b.date} · net payable {formatCurrency(b.netPayable, false)} · {b.status}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
