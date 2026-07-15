import { jsPDF } from 'jspdf';
import { printRoll } from './share';
import type { CompanyInfo } from './receipt';

/** Output targets for a sale invoice. */
export type PrintSize = '2in' | '3in' | '4in' | 'pdf';

/** Fallback presets used only when an org has no configured printers. */
export const PRINT_SIZES: { value: PrintSize; label: string; hint: string }[] = [
  { value: '2in', label: '2 inch (58mm)', hint: 'Thermal roll' },
  { value: '3in', label: '3 inch (80mm)', hint: 'Thermal roll' },
  { value: '4in', label: '4 inch (104mm)', hint: 'Thermal roll' },
  { value: 'pdf', label: 'PDF (A4)', hint: 'Download / share' },
];

/**
 * Geometry of whatever paper we're printing on. Any printer can be described by
 * these three numbers, which is what makes the print path model-agnostic.
 */
export interface PaperSpec {
  /** Full paper/roll width in mm. */
  widthMm: number;
  /** Base font size in px. */
  fontSize: number;
  /** Unprintable edge / padding in mm inside the width. */
  marginMm: number;
}

/** Sensible type size for an arbitrary roll width (used when adding a printer). */
export function defaultFontFor(widthMm: number): number {
  if (widthMm <= 60) return 9;
  if (widthMm <= 85) return 10.5;
  return 11.5;
}

export interface InvoiceLine {
  name: string;
  qty: number;
  weight: number;
  rate: number;
  amount: number;
}

export interface InvoiceData {
  company: CompanyInfo;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerMobile?: string;
  customerArea?: string;
  lines: InvoiceLine[];
  totalQty: number;
  totalWeight: number;
  /** What the buyer owes — the gross. Commission/market fee never appear here. */
  netAmount: number;
  paymentMode: string;
}

/** Minimal shape of a sale needed to bill it (keeps this util free of app types). */
export interface BillableSale {
  saleNumber: string;
  date: string;
  paymentMode: string;
  grossAmount: number;
  lines: { itemId: string; quantity: number; weight: number; rate: number; grossAmount: number }[];
}

/**
 * Assemble the buyer's invoice from a saved sale. Shared by Sale Entry (print
 * straight after billing) and the Billing page (reprint later) so both produce
 * an identical document.
 */
export function buildInvoiceData(args: {
  sale: BillableSale;
  company: CompanyInfo;
  customerName: string;
  customerMobile?: string;
  customerArea?: string;
  itemName: (id: string) => string;
}): InvoiceData {
  const lines: InvoiceLine[] = args.sale.lines.map((l) => ({
    name: args.itemName(l.itemId),
    qty: l.quantity,
    weight: l.weight,
    rate: l.rate,
    amount: l.grossAmount,
  }));
  return {
    company: args.company,
    invoiceNo: args.sale.saleNumber,
    date: args.sale.date,
    customerName: args.customerName,
    customerMobile: args.customerMobile,
    customerArea: args.customerArea,
    lines,
    totalQty: Math.round(lines.reduce((s, l) => s + l.qty, 0) * 100) / 100,
    totalWeight: Math.round(lines.reduce((s, l) => s + l.weight, 0) * 100) / 100,
    // The buyer owes the gross — commission/market fee stay off this bill.
    netAmount: args.sale.grossAmount,
    paymentMode: args.sale.paymentMode,
  };
}

const money = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-IN');
const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** The built-in presets, expressed as ordinary paper specs. */
export const THERMAL_PRESETS: Record<Exclude<PrintSize, 'pdf'>, PaperSpec> = {
  '2in': { widthMm: 58, fontSize: 9, marginMm: 2 },
  '3in': { widthMm: 80, fontSize: 10.5, marginMm: 2 },
  '4in': { widthMm: 104, fontSize: 11.5, marginMm: 2 },
};

/**
 * Print the invoice to any roll printer described by `paper`. Nothing here is
 * model-specific — a new printer is just a different PaperSpec.
 */
export function printThermalInvoice(d: InvoiceData, paper: PaperSpec | Exclude<PrintSize, 'pdf'>) {
  const g: PaperSpec = typeof paper === 'string' ? THERMAL_PRESETS[paper] : paper;
  // Very narrow rolls can't fit a two-column item grid.
  const narrow = g.widthMm <= 60;
  // No @page here — printRoll() measures the rendered height and injects an exact
  // `size: <w>mm <h>mm`, because `size: <w>mm auto` is invalid CSS and gets dropped
  // (which silently falls back to A4/Letter).
  const css = `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${g.widthMm}mm; padding: ${g.marginMm}mm;
      font-family: 'Courier New', ui-monospace, monospace;
      font-size: ${g.fontSize}px; line-height: 1.35; color: #000;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .c { text-align: center; }
    .r { text-align: right; }
    .b { font-weight: 700; }
    .lg { font-size: ${g.fontSize + 3}px; }
    .sm { font-size: ${g.fontSize - 1}px; }
    .hr { border-top: 1px dashed #000; margin: 3px 0; }
    .row { display: flex; justify-content: space-between; gap: 4px; }
    .row > span:last-child { text-align: right; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 1px 0; vertical-align: top; font-size: ${g.fontSize}px; }
    th { border-bottom: 1px dashed #000; text-align: left; }
    .amt { text-align: right; white-space: nowrap; }
    .item { word-break: break-word; }
    .total { font-size: ${g.fontSize + 2}px; font-weight: 700; }
  `;

  // On a 2" roll there's no room for a 4-column grid — put the item name on its
  // own line and the qty/rate maths underneath it.
  const items = d.lines
    .map((l) =>
      narrow
        ? `<tr><td colspan="2" class="item b">${esc(l.name)}</td></tr>
           <tr><td class="sm">${num(l.weight)}kg x ${money(l.rate)}</td><td class="amt">${money(l.amount)}</td></tr>`
        : `<tr><td class="item">${esc(l.name)}<div class="sm">${num(l.qty)} bag(s) · ${num(l.weight)}kg @ ${money(l.rate)}</div></td><td class="amt">${money(l.amount)}</td></tr>`,
    )
    .join('');

  const contact = [
    d.company.gstNumber ? `GSTIN: ${d.company.gstNumber}` : '',
    d.company.mobile ? `Ph: ${d.company.mobile}` : '',
  ].filter(Boolean).join('  ');

  printRoll(`Invoice ${d.invoiceNo}`, `
    <div class="c b lg">${esc(d.company.name)}</div>
    ${d.company.address ? `<div class="c sm">${esc(d.company.address)}</div>` : ''}
    ${contact ? `<div class="c sm">${esc(contact)}</div>` : ''}
    <div class="hr"></div>
    <div class="c b">TAX INVOICE</div>
    <div class="hr"></div>
    <div class="row sm"><span>Invoice</span><span class="b">${esc(d.invoiceNo)}</span></div>
    <div class="row sm"><span>Date</span><span>${esc(d.date)}</span></div>
    <div class="row sm"><span>Customer</span><span class="b">${esc(d.customerName)}</span></div>
    ${d.customerMobile ? `<div class="row sm"><span>Mobile</span><span>${esc(d.customerMobile)}</span></div>` : ''}
    <div class="hr"></div>
    <table>
      <thead><tr><th>Item</th><th class="amt">Amount</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div class="hr"></div>
    <div class="row sm"><span>Total bags</span><span>${num(d.totalQty)}</span></div>
    <div class="row sm"><span>Total weight</span><span>${num(d.totalWeight)} kg</span></div>
    <div class="hr"></div>
    <div class="row total"><span>NET AMOUNT</span><span>${money(d.netAmount)}</span></div>
    <div class="hr"></div>
    <div class="row sm"><span>Payment</span><span>${esc(d.paymentMode.toUpperCase())}</span></div>
    <div class="c sm" style="margin-top:6px">Thank you for your business!</div>
    <div class="c sm">This is a computer-generated invoice.</div>
  `, css, g.widthMm);
}

export interface BuiltInvoicePdf { blob: Blob; file: File; filename: string; }

/** Render the invoice as a proper A4 PDF (company header + line-item table). */
export function buildInvoicePdf(d: InvoiceData): BuiltInvoicePdf {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 52;

  // ---- Company header ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(d.company.name, M, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  if (d.company.address) {
    for (const line of doc.splitTextToSize(d.company.address, W - M * 2)) {
      doc.text(line, M, y);
      y += 12;
    }
  }
  const contact = [
    d.company.gstNumber ? `GSTIN: ${d.company.gstNumber}` : '',
    d.company.mobile ? `Ph: ${d.company.mobile}` : '',
    d.company.email ?? '',
  ].filter(Boolean).join('    ');
  if (contact) { doc.text(contact, M, y); y += 12; }
  doc.setTextColor(0);

  y += 8;
  doc.setDrawColor(150);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 24;

  // ---- Title + invoice meta ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(`${d.invoiceNo}    ${d.date}`, W - M, y, { align: 'right' });
  doc.setTextColor(0);
  y += 22;

  // ---- Bill to ----
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('BILL TO', M, y);
  doc.setTextColor(0);
  y += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(d.customerName, M, y);
  y += 13;
  const sub = [d.customerArea, d.customerMobile].filter(Boolean).join(' · ');
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    doc.text(sub, M, y);
    doc.setTextColor(0);
    y += 13;
  }
  y += 8;

  // ---- Line-item table ----
  const cols = { item: M, qty: M + 220, wt: M + 285, rate: M + 360, amt: W - M };
  doc.setFillColor(240, 243, 241);
  doc.rect(M, y - 11, W - M * 2, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ITEM', cols.item + 4, y);
  doc.text('BAGS', cols.qty, y, { align: 'right' });
  doc.text('WEIGHT', cols.wt, y, { align: 'right' });
  doc.text('RATE', cols.rate, y, { align: 'right' });
  doc.text('AMOUNT', cols.amt - 4, y, { align: 'right' });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const l of d.lines) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 60;
    }
    doc.text(doc.splitTextToSize(l.name, 205)[0], cols.item + 4, y);
    doc.text(num(l.qty), cols.qty, y, { align: 'right' });
    doc.text(`${num(l.weight)} kg`, cols.wt, y, { align: 'right' });
    doc.text(money(l.rate), cols.rate, y, { align: 'right' });
    doc.text(money(l.amount), cols.amt - 4, y, { align: 'right' });
    y += 15;
    doc.setDrawColor(232);
    doc.setLineWidth(0.5);
    doc.line(M, y - 5, W - M, y - 5);
  }

  // ---- Totals ----
  y += 8;
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(`Total bags: ${num(d.totalQty)}    Total weight: ${num(d.totalWeight)} kg`, M, y);
  doc.setTextColor(0);

  const boxW = 200;
  const boxX = W - M - boxW;
  doc.setFillColor(240, 243, 241);
  doc.rect(boxX, y - 14, boxW, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('NET AMOUNT', boxX + 8, y + 4);
  doc.text(money(d.netAmount), W - M - 8, y + 4, { align: 'right' });
  y += 34;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(`Payment mode: ${d.paymentMode.toUpperCase()}`, M, y);
  y += 26;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(120);
  doc.text('Thank you for your business!  ·  This is a computer-generated invoice.', M, y);
  doc.setTextColor(0);

  const filename = `${d.invoiceNo.replace(/[^a-z0-9-]+/gi, '-')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { blob, file, filename };
}

/** Download the invoice PDF. */
export function downloadInvoicePdf(d: InvoiceData) {
  const pdf = buildInvoicePdf(d);
  const url = URL.createObjectURL(pdf.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdf.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
