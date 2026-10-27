import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { useGetOrganizationQuery } from '@/api/adminApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import { shareOnWhatsApp } from '@/utils/share';
import { saleBill } from '@/utils/saleBill';
import PrintMenu from '@/components/common/PrintMenu';
import ThermalPrintDialog from '@/components/common/ThermalPrintDialog';
import { useInvoiceOutput } from '@/components/sales/useInvoiceOutput';
import type { Sale } from '@/types/domain';

/**
 * The complete sales-bill view in a professional, printable layout. Shared by
 * the All Sales screen (and reusable elsewhere). The on-screen view shows the
 * full internal breakdown (commission, market fee, paid, balance); Print / PDF /
 * WhatsApp still emit the buyer-facing invoice (gross + charges only) via the
 * shared `invoice` util, so the printed document is identical everywhere.
 */
export default function SaleInvoiceDialog({
  sale,
  onClose,
  onEdit,
  canEdit,
}: {
  sale: Sale | null;
  onClose: () => void;
  onEdit?: (sale: Sale) => void;
  canEdit?: boolean;
}) {
  const { data: org } = useGetOrganizationQuery();
  const { itemName, customers, customerName } = useLookups();
  const { output, invoiceText, thermalDoc, setThermalDoc } = useInvoiceOutput();
  const [printAnchor, setPrintAnchor] = useState<null | HTMLElement>(null);

  const customer = sale ? customers.find((c) => c.id === sale.customerId) : undefined;
  const bill = sale ? saleBill(sale) : null;

  return (
    <Dialog open={Boolean(sale)} onClose={onClose} fullWidth maxWidth="sm">
      {sale && bill && (
        <>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongRoundedIcon color="success" />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              Invoice {sale.saleNumber}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
                {customerName(sale.customerId)} · {sale.date}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={bill.status === 'paid' ? 'Paid' : 'Unpaid'}
              color={bill.status === 'paid' ? 'success' : 'warning'}
              sx={{ fontWeight: 700 }}
            />
          </DialogTitle>
          <DialogContent dividers>
            {/* Company + customer header */}
            <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 1.5 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>{org?.name ?? 'Mandi ERP'}</Typography>
                {org?.address && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {org.address}
                  </Typography>
                )}
                {(org?.gstNumber || org?.mobile) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {[org?.gstNumber ? `GSTIN: ${org.gstNumber}` : '', org?.mobile ? `Ph: ${org.mobile}` : '']
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary">Bill to</Typography>
                <Typography sx={{ fontWeight: 700 }}>{customerName(sale.customerId)}</Typography>
                {customer?.area && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{customer.area}</Typography>
                )}
                {customer?.mobile && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{customer.mobile}</Typography>
                )}
              </Box>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">kg</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{itemName(l.itemId)}</TableCell>
                    <TableCell align="right">{l.quantity}</TableCell>
                    <TableCell align="right">{l.weight}</TableCell>
                    <TableCell align="right">₹{l.rate}</TableCell>
                    <TableCell align="right">{formatCurrency(l.grossAmount, false)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={0.5}>
              <Row label="Subtotal (goods)" value={bill.subtotal} />
              {bill.otherCharges > 0 && (
                <Row label={`Other charges${sale.otherChargesNote ? ` (${sale.otherChargesNote})` : ''}`} value={bill.otherCharges} />
              )}
              <Row label="Grand total" value={bill.grandTotal} bold />
              <Row label="Paid" value={bill.paid} />
              <Row label="Balance" value={bill.balance} color={bill.balance > 0 ? 'warning.main' : undefined} />
            </Stack>

            {/* Internal figures — not printed on the buyer's invoice. */}
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', flexWrap: 'wrap' }}>
              <Typography variant="caption">Commission {formatCurrency(bill.commission, false)}</Typography>
              <Typography variant="caption">Market fee {formatCurrency(bill.marketFee, false)}</Typography>
              <Typography variant="caption" sx={{ ml: { sm: 'auto' } }}>Payment: {sale.paymentMode.toUpperCase()}</Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
            {canEdit && onEdit && (
              <Button startIcon={<EditRoundedIcon />} onClick={() => onEdit(sale)} sx={{ mr: 'auto' }}>
                Edit
              </Button>
            )}
            <Button color="inherit" onClick={onClose}>Close</Button>
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
              onPick={(paper) => {
                setPrintAnchor(null);
                output(sale, paper);
              }}
            />
            <ThermalPrintDialog doc={thermalDoc} onClose={() => setThermalDoc(null)} />
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={() => shareOnWhatsApp(invoiceText(sale), customer?.mobile)}
            >
              WhatsApp
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function Row({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600, color }}>{formatCurrency(value, false)}</Typography>
    </Stack>
  );
}
