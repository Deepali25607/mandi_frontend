import type { InvoiceData } from '@/utils/invoice';

/**
 * Receipt layout engine — the single source of truth for what a thermal receipt
 * looks like. Every output format (raster image, ESC/POS text, plain text) AND
 * the on-screen preview render from the ReceiptLine[] this module produces, so
 * the preview always matches the paper.
 */

export interface ReceiptLine {
  text: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  /** Double-width+height (headers / net amount). */
  double: boolean;
}

/** 203dpi printable dot widths per roll (spec: 58→384, 80→576, 104→832). */
export function dotsForWidth(widthMm: number): number {
  if (widthMm <= 58) return 384;
  if (widthMm <= 80) return 576;
  if (widthMm <= 104) return 832;
  // Custom wide rolls: printable ≈ (width − 10mm margins) at 8 dots/mm.
  return Math.min(832, Math.round((widthMm - 10) * 8));
}

/** Characters per line for a roll width (12-dot glyph advance at 203dpi). */
export function colsForWidth(widthMm: number): number {
  if (widthMm <= 58) return 32;
  if (widthMm <= 80) return 48;
  if (widthMm <= 104) return 64;
  return Math.max(24, Math.floor(dotsForWidth(widthMm) / 12));
}

/**
 * ASCII-normalize for the text formats: NFKD-decompose, strip everything above
 * 0x7E. Currency must already be expressed as "INR"/"Rs" by the caller — this
 * is the safety net, not the converter.
 */
export function toAscii(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/₹/g, 'Rs')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/ +/g, (m) => m); // keep runs — they ARE the layout
}

const money = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-IN');

function line(text: string, align: ReceiptLine['align'] = 'left', bold = false, double = false): ReceiptLine {
  return { text, align, bold, double };
}

/** Left + right text padded apart to exactly `cols` characters. */
export function padBetween(left: string, right: string, cols: number): string {
  const gap = cols - left.length - right.length;
  if (gap >= 1) return left + ' '.repeat(gap) + right;
  // Too long: truncate the left side, always keep the value readable.
  const keep = Math.max(1, cols - right.length - 2);
  return `${left.slice(0, keep)}~ ${right}`.slice(0, cols);
}

/** Greedy word-wrap to the column width. */
export function wrap(text: string, cols: number): string[] {
  const out: string[] = [];
  for (const hard of text.split('\n')) {
    let cur = '';
    for (const word of hard.split(/\s+/).filter(Boolean)) {
      if (!cur.length) cur = word.slice(0, cols);
      else if (cur.length + 1 + word.length <= cols) cur += ` ${word}`;
      else { out.push(cur); cur = word.slice(0, cols); }
    }
    out.push(cur);
  }
  return out.length ? out : [''];
}

/**
 * Lay an invoice out as receipt lines for a given column count.
 * Throws when the document would produce an empty receipt — an empty payload
 * must never reach a printer.
 */
export function layoutInvoice(d: InvoiceData, cols: number): ReceiptLine[] {
  if (!d || (!d.lines?.length && !d.netAmount)) {
    throw new Error('Invoice has no lines or total — refusing to lay out an empty receipt.');
  }
  const L: ReceiptLine[] = [];
  const divider = '-'.repeat(cols);
  const narrow = cols <= 32;

  // ---- Header ----
  // Double-size text halves the columns available to it.
  for (const t of wrap(d.company.name, Math.floor(cols / 2))) L.push(line(t, 'center', true, true));
  if (d.company.address) for (const t of wrap(d.company.address, cols)) L.push(line(t, 'center'));
  const contact = [
    d.company.gstNumber ? `GSTIN: ${d.company.gstNumber}` : '',
    d.company.mobile ? `Ph: ${d.company.mobile}` : '',
  ].filter(Boolean).join('  ');
  if (contact) for (const t of wrap(contact, cols)) L.push(line(t, 'center'));

  L.push(line(divider));
  L.push(line('TAX INVOICE', 'center', true));
  L.push(line(divider));

  // ---- Meta ----
  L.push(line(padBetween('Invoice', d.invoiceNo, cols), 'left', true));
  L.push(line(padBetween('Date', d.date, cols)));
  L.push(line(padBetween('Customer', d.customerName.slice(0, cols - 10), cols), 'left', true));
  if (d.customerMobile) L.push(line(padBetween('Mobile', d.customerMobile, cols)));
  L.push(line(divider));

  // ---- Items ----
  L.push(line(padBetween('ITEM', 'AMOUNT', cols), 'left', true));
  L.push(line(divider));
  for (const it of d.lines) {
    const amount = money(it.amount);
    if (narrow) {
      // Name on its own line, maths underneath (2" roll).
      for (const t of wrap(it.name, cols)) L.push(line(t, 'left', true));
      L.push(line(padBetween(`${num(it.weight)}kg x ${money(it.rate)}`, amount, cols)));
    } else {
      L.push(line(padBetween(it.name.slice(0, cols - amount.length - 2), amount, cols), 'left', true));
      L.push(line(`  ${num(it.qty)} bag(s) - ${num(it.weight)}kg @ ${money(it.rate)}`));
    }
  }
  L.push(line(divider));

  // ---- Totals ----
  L.push(line(padBetween('Total bags', num(d.totalQty), cols)));
  L.push(line(padBetween('Total weight', `${num(d.totalWeight)} kg`, cols)));
  L.push(line(divider));
  // Double-size total halves the columns; on narrow rolls the label+value pair
  // can't share a line without truncating digits — split instead.
  {
    const label = 'NET AMOUNT';
    const value = `Rs ${money(d.netAmount)}`;
    const half = Math.floor(cols / 2);
    if (label.length + value.length + 1 <= half) {
      L.push(line(padBetween(label, value, half), 'left', true, true));
    } else {
      L.push(line(label, 'left', true));
      L.push(line(value, 'right', true, true));
    }
  }
  L.push(line(divider));
  L.push(line(padBetween('Payment', d.paymentMode.toUpperCase(), cols)));
  L.push(line(''));
  L.push(line('Thank you for your business!', 'center'));
  L.push(line('Computer-generated invoice', 'center'));

  if (!L.some((l) => l.text.trim().length > 0)) {
    throw new Error('Receipt layout produced no printable text.');
  }
  return L;
}

/**
 * Render layout lines to a plain string (preview + the "Old" format both use
 * this) — alignment becomes space padding; double-size lines are shown as-is.
 */
export function linesToPlainText(lines: ReceiptLine[], cols: number): string {
  return lines
    .map((l) => {
      const width = l.double ? Math.floor(cols / 2) : cols;
      const t = l.text.length > width ? l.text.slice(0, width) : l.text;
      if (l.align === 'center') return ' '.repeat(Math.max(0, Math.floor((width - t.length) / 2))) + t;
      if (l.align === 'right') return ' '.repeat(Math.max(0, width - t.length)) + t;
      return t;
    })
    .join('\n');
}
