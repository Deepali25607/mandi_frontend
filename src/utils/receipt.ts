import { jsPDF } from 'jspdf';
import { shareOnWhatsApp } from './share';

export interface CompanyInfo {
  name: string;
  address?: string;
  gstNumber?: string;
  mobile?: string;
  email?: string;
}

export interface ReceiptField {
  label: string;
  value: string;
  /** Render larger/bold (e.g. the amount). */
  strong?: boolean;
}

export interface ReceiptDoc {
  company: CompanyInfo;
  docTitle: string; // e.g. "PAYMENT RECEIPT"
  number: string;
  date: string;
  partyLabel: string; // e.g. "Received from"
  partyName: string;
  fields: ReceiptField[];
  note?: string;
}

export interface BuiltPdf {
  blob: Blob;
  file: File;
  filename: string;
}

/** Render a compact, company-branded A5 receipt as a PDF (client-side). */
export function buildReceiptPdf(d: ReceiptDoc): BuiltPdf {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 50;

  // ---- Company header (the "company details" block) ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(d.company.name, M, y);
  y += 17;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
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
  if (contact) {
    doc.text(contact, M, y);
    y += 12;
  }
  doc.setTextColor(0);

  y += 8;
  doc.setDrawColor(180);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 24;

  // ---- Document title + number/date ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(d.docTitle, M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`${d.number}    ${d.date}`, W - M, y, { align: 'right' });
  doc.setTextColor(0);
  y += 22;

  // ---- Party ----
  doc.setFontSize(10);
  const prefix = `${d.partyLabel}: `;
  doc.text(prefix, M, y);
  doc.setFont('helvetica', 'bold');
  doc.text(d.partyName, M + doc.getTextWidth(prefix), y);
  doc.setFont('helvetica', 'normal');
  y += 14;

  doc.setDrawColor(225);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 20;

  // ---- Fields ----
  for (const f of d.fields) {
    doc.setFont('helvetica', f.strong ? 'bold' : 'normal');
    doc.setFontSize(f.strong ? 12 : 10);
    doc.text(f.label, M, y);
    doc.text(f.value, W - M, y, { align: 'right' });
    y += f.strong ? 20 : 16;
  }

  // ---- Note / footer ----
  if (d.note) {
    y += 14;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(120);
    doc.text(d.note, M, y);
    doc.setTextColor(0);
  }

  const filename = `${d.number.replace(/[^a-z0-9-]+/gi, '-')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { blob, file, filename };
}

/**
 * Share a PDF receipt on WhatsApp. On devices that support the Web Share API
 * with files (most phones), this opens the native share sheet with the PDF
 * attached and WhatsApp as a target. Otherwise it downloads the PDF and opens
 * WhatsApp with the message so the user attaches the file manually.
 */
export async function shareReceiptOnWhatsApp(
  pdf: BuiltPdf,
  message: string,
  mobile?: string,
): Promise<'shared' | 'downloaded'> {
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pdf.file] });

  if (canShareFiles) {
    try {
      await navigator.share({ files: [pdf.file], text: message });
      return 'shared';
    } catch (e) {
      // User dismissed the share sheet — treat as handled, don't double up.
      if ((e as DOMException)?.name === 'AbortError') return 'shared';
      // Any other failure falls through to the download path.
    }
  }

  const url = URL.createObjectURL(pdf.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdf.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  shareOnWhatsApp(message, mobile);
  return 'downloaded';
}
