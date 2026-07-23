import type { ReceiptLine } from './layout';

/**
 * "Image" format — the DEFAULT. Renders the receipt to a canvas and emits
 * `GS v 0` raster bands. Font-independent: works even on printers whose text
 * engine is broken, and keeps Unicode (₹, Hindi names) intact.
 */

/** Luminance cut-off for 1-bit conversion. ~110 keeps the anti-aliasing
 * fringe of the font OUT of the bitmap — higher thresholds print speckle. */
const THRESHOLD = 110;
/** Max rows per GS v 0 command. Large bands keep the motor moving — one band
 * per text line makes the head stop-start and the print crawls. */
const MAX_BAND_ROWS = 240;
/** Blank runs shorter than this stay INSIDE the bitmap (feed-unit firmware
 * variance squashes small ESC J gaps); only longer runs become paper feeds. */
const MIN_FEED_GAP_ROWS = 32;

/** Render the receipt lines onto a canvas at the printer's dot width. */
export function renderReceiptCanvas(lines: ReceiptLine[], dots: number, cols: number): HTMLCanvasElement {
  const charW = dots / cols;
  // Calibrate the font so one monospace glyph advance = charW exactly.
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = 'bold 100px "Courier New", ui-monospace, monospace';
  const advance100 = probe.measureText('0').width || 60;
  const fontPx = Math.floor((charW / advance100) * 100);
  const lineH = Math.ceil(fontPx * 1.45);

  const totalH = lines.reduce((h, l) => h + (l.double ? lineH * 2 : lineH), 0) + 16;
  const canvas = document.createElement('canvas');
  canvas.width = dots;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, dots, totalH);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';

  let y = 8;
  for (const l of lines) {
    const scale = l.double ? 2 : 1;
    ctx.font = `bold ${fontPx}px "Courier New", ui-monospace, monospace`;
    const textW = ctx.measureText(l.text).width * scale;
    const x = l.align === 'center' ? (dots - textW) / 2 : l.align === 'right' ? dots - textW : 0;
    ctx.save();
    ctx.translate(Math.max(0, x), y);
    if (l.double) ctx.scale(2, 2);
    ctx.fillText(l.text, 0, 0);
    ctx.restore();
    y += lineH * scale;
  }
  return canvas;
}

/** Canvas → 1-bit rows (MSB-first), thresholded at ~110 luminance. */
function toBitRows(canvas: HTMLCanvasElement): { rows: Uint8Array[]; bytesPerRow: number } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bytesPerRow = Math.ceil(canvas.width / 8);
  const rows: Uint8Array[] = [];
  for (let ry = 0; ry < canvas.height; ry++) {
    const row = new Uint8Array(bytesPerRow);
    for (let rx = 0; rx < canvas.width; rx++) {
      const i = (ry * canvas.width + rx) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < THRESHOLD) row[rx >> 3] |= 0x80 >> (rx & 7);
    }
    rows.push(row);
  }
  return { rows, bytesPerRow };
}

const isBlank = (row: Uint8Array) => row.every((b) => b === 0);

/**
 * Assemble the raster payload: ESC @ + large GS v 0 bands. Small gaps are
 * merged into the bitmap; only long blank runs become ESC J feeds.
 */
export function buildImage(
  lines: ReceiptLine[],
  dots: number,
  cols: number,
  opts: { feedLines: number; autoCut: boolean },
): Uint8Array {
  const canvas = renderReceiptCanvas(lines, dots, cols);
  const { rows, bytesPerRow } = toBitRows(canvas);

  // Split rows into content segments and LONG blank runs.
  type Segment = { kind: 'content'; rows: Uint8Array[] } | { kind: 'feed'; count: number };
  const segments: Segment[] = [];
  let i = 0;
  while (i < rows.length) {
    if (isBlank(rows[i])) {
      let j = i;
      while (j < rows.length && isBlank(rows[j])) j++;
      const run = j - i;
      const last = segments[segments.length - 1];
      if (run >= MIN_FEED_GAP_ROWS) segments.push({ kind: 'feed', count: run });
      else if (last?.kind === 'content') last.rows.push(...rows.slice(i, j)); // merge small gap into bitmap
      // Leading small gap: drop it.
      i = j;
    } else {
      let j = i;
      while (j < rows.length && !isBlank(rows[j])) j++;
      const last = segments[segments.length - 1];
      const slice = rows.slice(i, j);
      if (last?.kind === 'content') last.rows.push(...slice);
      else segments.push({ kind: 'content', rows: slice });
      i = j;
    }
  }

  const parts: number[] = [0x1b, 0x40]; // ESC @
  for (const seg of segments) {
    if (seg.kind === 'feed') {
      // ESC J feeds in dot units, capped per command.
      let left = seg.count;
      while (left > 0) {
        const n = Math.min(255, left);
        parts.push(0x1b, 0x4a, n);
        left -= n;
      }
      continue;
    }
    // Emit content in large bands (≤ MAX_BAND_ROWS rows per GS v 0).
    for (let b = 0; b < seg.rows.length; b += MAX_BAND_ROWS) {
      const band = seg.rows.slice(b, b + MAX_BAND_ROWS);
      const h = band.length;
      parts.push(
        0x1d, 0x76, 0x30, 0x00,
        bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
        h & 0xff, (h >> 8) & 0xff,
      );
      for (const row of band) for (const byte of row) parts.push(byte);
    }
  }

  // Trailing feed as bare newlines (safe after raster on every board tested).
  for (let f = 0; f < Math.min(8, opts.feedLines); f++) parts.push(0x0a);
  if (opts.autoCut) parts.push(0x1d, 0x56, 0x42, 0x00); // GS V B 0

  return Uint8Array.from(parts);
}
