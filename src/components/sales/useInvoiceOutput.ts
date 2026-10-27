import { useState } from 'react';
import { useGetOrganizationQuery } from '@/api/adminApi';
import { useLookups } from '@/utils/useLookups';
import { formatCurrency } from '@/utils/format';
import {
  buildInvoiceData,
  downloadInvoicePdf,
  printThermalInvoice,
  type InvoiceData,
} from '@/utils/invoice';
import type { PrintTarget } from '@/components/common/PrintMenu';
import type { Sale } from '@/types/domain';

/**
 * Shared invoice plumbing for sale bills — builds the buyer-facing invoice and
 * drives the Print / PDF / thermal / WhatsApp paths from one place so every
 * screen (Sale Entry, Billing, All Sales) prints an identical document.
 */
export function useInvoiceOutput() {
  const { data: org } = useGetOrganizationQuery();
  const { itemName, customers, customerName } = useLookups();
  const [thermalDoc, setThermalDoc] = useState<InvoiceData | null>(null);

  const invoiceData = (sale: Sale): InvoiceData => {
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

  /** null = PDF; 'bluetooth' = thermal preview; otherwise a roll printer spec. */
  const output = (sale: Sale, paper: PrintTarget) => {
    if (paper === 'bluetooth') setThermalDoc(invoiceData(sale));
    else if (!paper) downloadInvoicePdf(invoiceData(sale));
    else printThermalInvoice(invoiceData(sale), paper);
  };

  /** Buyer-facing WhatsApp summary — gross + charges only, no commission. */
  const invoiceText = (sale: Sale) =>
    [
      `*${org?.name ?? 'Mandi ERP'}*`,
      `Invoice ${sale.saleNumber} · ${sale.date}`,
      `Customer: ${customerName(sale.customerId)}`,
      '',
      ...sale.lines.map(
        (l) => `${itemName(l.itemId)} — ${l.weight}kg @ ₹${l.rate} = ${formatCurrency(l.grossAmount, false)}`,
      ),
      ...(sale.otherCharges > 0
        ? [`Other charges${sale.otherChargesNote ? ` (${sale.otherChargesNote})` : ''}: ${formatCurrency(sale.otherCharges, false)}`]
        : []),
      '',
      `*Net Amount: ${formatCurrency(sale.grossAmount + sale.otherCharges, false)}*`,
      `Payment: ${sale.paymentMode.toUpperCase()}`,
    ].join('\n');

  const customerMobile = (sale: Sale) => customers.find((c) => c.id === sale.customerId)?.mobile;

  return { invoiceData, output, invoiceText, customerMobile, thermalDoc, setThermalDoc };
}
