import { jsPDF } from 'jspdf';
import type { LedgerRow, Party } from './types';
import type { PartySummary } from './utils';
import { formatShortDate, formatTime } from './utils';

/** jsPDF's built-in fonts lack the ₹ glyph, so PDFs use "Rs". */
const rs = (n: number) => `Rs ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n))}`;

function header(doc: jsPDF, business: string, title: string, subtitle: string) {
  doc.setFillColor(13, 71, 161);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16).setFont('helvetica', 'bold').text(business, 12, 11);
  doc.setFontSize(11).setFont('helvetica', 'normal').text(title, 12, 19);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9).text(subtitle, 12, 33);
}

function tableHead(doc: jsPDF, y: number, cols: [string, number, 'left' | 'right'][]) {
  doc.setFillColor(231, 238, 251);
  doc.rect(10, y - 5, 190, 8, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(13, 71, 161);
  cols.forEach(([label, x, align]) => doc.text(label, x, y, { align }));
  doc.setFont('helvetica', 'normal').setTextColor(40, 40, 40);
}

/** Party statement: every entry with running balance, newest first. */
export function downloadLedgerPdf(business: string, party: Party, rows: LedgerRow[], balance: number) {
  const doc = new jsPDF();
  const status = balance > 0 ? `You will get ${rs(balance)}` : balance < 0 ? `You will give ${rs(balance)}` : 'Settled up';
  header(doc, business, `${party.type === 'customer' ? 'Customer' : 'Supplier'} statement — ${party.name}`, `${party.phone ? `Mobile ${party.phone} · ` : ''}${status} · Generated ${new Date().toLocaleDateString('en-GB')}`);

  const cols: [string, number, 'left' | 'right'][] = [
    ['Date', 12, 'left'],
    ['Details', 50, 'left'],
    ['You gave', 140, 'right'],
    ['You got', 168, 'right'],
    ['Balance', 198, 'right'],
  ];
  let y = 45;
  tableHead(doc, y, cols);
  y += 8;
  doc.setFontSize(9);
  for (const r of rows) {
    if (y > 280) {
      doc.addPage();
      y = 20;
      tableHead(doc, y, cols);
      y += 8;
    }
    doc.text(`${formatShortDate(r.at)} ${formatTime(r.at)}`, 12, y);
    doc.text(doc.splitTextToSize(r.note ?? '', 80)[0] ?? '', 50, y);
    if (r.type === 'gave') doc.setTextColor(196, 18, 48).text(rs(r.amount), 140, y, { align: 'right' });
    else doc.setTextColor(15, 123, 79).text(rs(r.amount), 168, y, { align: 'right' });
    doc.setTextColor(40, 40, 40).text(`${r.balanceAfter < 0 ? '-' : ''}${rs(r.balanceAfter)}`, 198, y, { align: 'right' });
    y += 7;
  }
  doc.setFont('helvetica', 'bold').text(`Net balance: ${status}`, 198, y + 4, { align: 'right' });
  doc.save(`${party.name.replace(/[^\w]+/g, '_')}_statement.pdf`);
}

/** Dashboard report: all parties of a type with their balances. */
export function downloadPartiesReportPdf(business: string, label: string, summaries: PartySummary[], give: number, get: number) {
  const doc = new jsPDF();
  header(doc, business, `${label} balances report`, `You will give ${rs(give)} · You will get ${rs(get)} · Generated ${new Date().toLocaleDateString('en-GB')}`);
  const cols: [string, number, 'left' | 'right'][] = [
    ['Party', 12, 'left'],
    ['Mobile', 95, 'left'],
    ['Last activity', 140, 'left'],
    ['Balance', 198, 'right'],
  ];
  let y = 45;
  tableHead(doc, y, cols);
  y += 8;
  doc.setFontSize(9);
  for (const s of summaries) {
    if (y > 280) {
      doc.addPage();
      y = 20;
      tableHead(doc, y, cols);
      y += 8;
    }
    doc.setTextColor(40, 40, 40);
    doc.text(s.party.name, 12, y);
    doc.text(s.party.phone ?? '—', 95, y);
    doc.text(s.lastActivity ? formatShortDate(s.lastActivity) : '—', 140, y);
    if (s.balance > 0) doc.setTextColor(196, 18, 48);
    else if (s.balance < 0) doc.setTextColor(15, 123, 79);
    doc.text(s.balance === 0 ? 'Settled' : `${s.balance > 0 ? 'Get' : 'Give'} ${rs(s.balance)}`, 198, y, { align: 'right' });
    y += 7;
  }
  doc.save(`${label.toLowerCase()}_balances.pdf`);
}
