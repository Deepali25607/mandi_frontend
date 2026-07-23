import type { InvoiceData } from '@/utils/invoice';
import { downloadInvoicePdf } from '@/utils/invoice';
import { colsForWidth, dotsForWidth, layoutInvoice, linesToPlainText, toAscii } from './layout';
import { buildModern, buildOld, buildTestLine } from './escpos';
import { buildImage } from './raster';
import { loadThermalSettings, paperWidthMm, type ThermalSettings } from './settings';
import { isWebBluetoothAvailable, printOverBle, PrintTransportError } from './webBluetooth';

/**
 * The ONE print entry point. UI code calls printReceipt(); routing, payload
 * building, validation and error mapping all live behind it. On any failure
 * the caller gets an actionable message plus a PDF fallback — never a dead end.
 */

export interface PrintResult {
  ok: boolean;
  /** True when the user simply cancelled a chooser — no error UI needed. */
  cancelled?: boolean;
  message?: string;
  /** Offer "Save as PDF instead" when true. */
  offerPdf?: boolean;
}

export function effectiveCols(s: ThermalSettings): number {
  return s.charsPerLine === 'auto' ? colsForWidth(paperWidthMm(s)) : s.charsPerLine;
}

/** Build the exact byte payload the printer will receive (also used by tests). */
export function buildPayload(doc: InvoiceData, s: ThermalSettings): Uint8Array {
  const widthMm = paperWidthMm(s);
  const cols = effectiveCols(s);
  const lines = layoutInvoice(doc, cols); // throws on empty docs

  let payload: Uint8Array;
  if (s.format === 'image') {
    payload = buildImage(lines, dotsForWidth(widthMm), cols, { feedLines: s.feedLines, autoCut: s.autoCut });
  } else if (s.format === 'modern') {
    // Text modes are ASCII-only: currency as "Rs"/"INR", no UTF-8 multibyte.
    const asciiLines = lines.map((l) => ({ ...l, text: toAscii(l.text) }));
    payload = buildModern(asciiLines, {
      encoding: s.encoding,
      density: s.density,
      feedLines: s.feedLines,
      autoCut: s.autoCut,
    });
  } else {
    const asciiLines = lines.map((l) => ({ ...l, text: toAscii(l.text) }));
    payload = buildOld(linesToPlainText(asciiLines, cols), s.feedLines);
  }

  // A commands-only or near-empty payload means something upstream broke.
  if (payload.length < 16) throw new Error('Refusing to send a near-empty print payload.');
  return payload;
}

/** Preview text — driven by the SAME layout engine as the print itself. */
export function previewText(doc: InvoiceData, s: ThermalSettings): string {
  const cols = effectiveCols(s);
  return linesToPlainText(layoutInvoice(doc, cols), cols);
}

function validate(doc: InvoiceData): string | null {
  if (!doc) return 'No document to print.';
  if (!doc.lines?.length && !doc.netAmount) return 'This bill has no items or total — nothing to print.';
  return null;
}

/** Map transport failures to actionable user guidance. */
function friendly(e: unknown): PrintResult {
  if (e instanceof PrintTransportError) {
    if (e.code === 'user-cancelled') return { ok: false, cancelled: true };
    return { ok: false, message: e.message, offerPdf: true };
  }
  const msg = (e as Error)?.message ?? 'Unknown print error';
  if (/bluetooth/i.test(msg) && /off|disabled|unavailable/i.test(msg)) {
    return { ok: false, message: 'Bluetooth appears to be off — enable it in system settings and retry.', offerPdf: true };
  }
  return { ok: false, message: msg, offerPdf: true };
}

/**
 * Print a receipt through the configured route:
 * - "bluetooth" → Web Bluetooth BLE (Chrome/Edge)
 * - anything else, or any hard failure → the caller falls back to PDF/system
 *   dialog (existing printThermalInvoice / downloadInvoicePdf paths).
 */
export async function printReceipt(doc: InvoiceData, overrides?: Partial<ThermalSettings>): Promise<PrintResult> {
  const s = { ...loadThermalSettings(), ...overrides };

  const invalid = validate(doc);
  if (invalid) return { ok: false, message: invalid };

  if (s.printerType !== 'bluetooth') {
    return { ok: false, message: 'Thermal Bluetooth printing is not enabled in Printer Settings.', offerPdf: true };
  }
  if (!isWebBluetoothAvailable()) {
    return {
      ok: false,
      offerPdf: true,
      message: 'This browser cannot talk to Bluetooth printers (Safari/Firefox). Use Chrome/Edge, or save as PDF.',
    };
  }
  if (!s.deviceId) {
    return { ok: false, message: 'No printer connected yet — open Printer Settings and connect one.', offerPdf: true };
  }

  try {
    const payload = buildPayload(doc, s);
    await printOverBle(s.deviceId, payload, s.pinnedChannel ?? undefined);
    return { ok: true };
  } catch (e) {
    return friendly(e);
  }
}

/** Native-style test line (ESC/POS + CPCL + TSPL probe blocks). */
export async function printTestLine(deviceId: string, pinnedChannel?: string): Promise<PrintResult> {
  try {
    await printOverBle(deviceId, buildTestLine(), pinnedChannel);
    return { ok: true };
  } catch (e) {
    return friendly(e);
  }
}

/** Shared PDF fallback so every failure path lands somewhere useful. */
export function fallbackToPdf(doc: InvoiceData): void {
  downloadInvoicePdf(doc);
}

/** A deterministic sample bill for the settings-screen test buttons. */
export function sampleBill(companyName: string): InvoiceData {
  return {
    company: { name: companyName || 'Sample Mandi', address: 'Printer test — not a real bill', mobile: '99999 99999' },
    invoiceNo: 'TEST-0001',
    date: new Date().toISOString().slice(0, 10),
    customerName: 'Sample Customer',
    customerMobile: '98888 88888',
    lines: [
      { name: 'Onion', qty: 30, weight: 1415.5, rate: 29, amount: 41049.5 },
      { name: 'Potato', qty: 12, weight: 600, rate: 18, amount: 10800 },
      { name: 'Tomato (Desi)', qty: 5, weight: 125.25, rate: 42.5, amount: 5323.13 },
    ],
    totalQty: 47,
    totalWeight: 2140.75,
    netAmount: 57172.63,
    paymentMode: 'cash',
  };
}
