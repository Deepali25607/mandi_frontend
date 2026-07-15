import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useGetSalesQuery } from '@/api/operationsApi';
import { useGetOrganizationQuery } from '@/api/adminApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import { shareOnWhatsApp } from '@/utils/share';
import { buildInvoiceData, downloadInvoicePdf, printThermalInvoice, type PaperSpec } from '@/utils/invoice';
import PrintMenu from '@/components/common/PrintMenu';
import type { Sale } from '@/types/domain';

export default function BillingPage() {
  const { data: sales, isLoading } = useGetSalesQuery();
  const { data: org } = useGetOrganizationQuery();
  const { itemName, customers, customerName } = useLookups();
  const [active, setActive] = useState<Sale | null>(null);
  const [printAnchor, setPrintAnchor] = useState<null | HTMLElement>(null);

  const customer = active ? customers.find((c) => c.id === active.customerId) : undefined;

  const invoiceText = (sale: Sale) =>
    [
      `*${org?.name ?? 'Mandi ERP'}*`,
      `Invoice ${sale.saleNumber} · ${sale.date}`,
      `Customer: ${customerName(sale.customerId)}`,
      '',
      ...sale.lines.map((l) => `${itemName(l.itemId)} — ${l.weight}kg @ ₹${l.rate} = ${formatCurrency(l.grossAmount, false)}`),
      '',
      `*Net Amount: ${formatCurrency(sale.grossAmount, false)}*`,
      `Payment: ${sale.paymentMode.toUpperCase()}`,
    ].join('\n');

  const invoiceData = (sale: Sale) => {
    const c = customers.find((x) => x.id === sale.customerId);
    return buildInvoiceData({
      sale,
      company: {
        name: org?.name ?? 'Mandi ERP',
        address: org?.address,
        gstNumber: org?.gstNumber,
        mobile: org?.mobile,
        email: org?.email,
      },
      customerName: customerName(sale.customerId),
      customerMobile: c?.mobile,
      customerArea: c?.area,
      itemName,
    });
  };

  /** `paper` null = PDF; otherwise print to that configured printer. */
  const output = (sale: Sale, paper: PaperSpec | null) => {
    setPrintAnchor(null);
    if (!paper) downloadInvoicePdf(invoiceData(sale));
    else printThermalInvoice(invoiceData(sale), paper);
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Customer Billing</Typography>
      <Typography variant="body2" color="text.secondary">Tap a sale to view, print or share the invoice.</Typography>

      {isLoading ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : !sales || sales.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No sales/invoices yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {sales.map((s) => (
            <Card key={s.id}>
              <CardActionArea onClick={() => setActive(s)} sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>{customerName(s.customerId)}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.saleNumber} · {s.date} · {s.lines.length} item(s)</Typography>
                  </Box>
                  <Chip size="small" label={s.paymentMode} sx={{ height: 20, fontSize: '0.65rem' }} />
                  <Typography sx={{ fontWeight: 800 }}>{formatCurrency(s.grossAmount)}</Typography>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(active)} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        {active && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Invoice {active.saleNumber}
              <Typography variant="body2" color="text.secondary">{customerName(active.customerId)} · {active.date}</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">kg</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {active.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{itemName(l.itemId)}</TableCell>
                      <TableCell align="right">{l.weight}</TableCell>
                      <TableCell align="right">₹{l.rate}</TableCell>
                      <TableCell align="right">{formatCurrency(l.grossAmount, false)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider sx={{ my: 1.5 }} />
              {/* Customer's bill: gross only — commission/market fee are the
                  supplier's deductions and stay off the buyer's invoice. */}
              <Stack spacing={0.5}>
                <Row label="Net Amount" value={active.grossAmount} bold />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button
                startIcon={<PrintRoundedIcon />}
                endIcon={<ExpandMoreRoundedIcon />}
                onClick={(e) => setPrintAnchor(e.currentTarget)}
              >
                Print / PDF
              </Button>
              <PrintMenu
                anchorEl={printAnchor}
                onClose={() => setPrintAnchor(null)}
                onPick={(paper) => output(active, paper)}
              />
              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={() => shareOnWhatsApp(invoiceText(active), customer?.mobile)}
              >
                WhatsApp
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600 }}>{formatCurrency(value, false)}</Typography>
    </Stack>
  );
}
