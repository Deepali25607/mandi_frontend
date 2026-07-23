import { toAscii, type ReceiptLine } from './layout';

/**
 * ESC/POS text-mode payload builders — the "Modern" (styled) and "Old"
 * (maximum-compatibility) formats. Both send ONLY printable ASCII: text modes
 * normalize via NFKD and never emit multibyte UTF-8, HTML or JSON.
 */

export type ThermalEncoding = 'cp437' | 'cp850' | 'utf8';

const ESC = 0x1b;
const GS = 0x1d;

function bytes(...parts: (number[] | Uint8Array | string)[]): Uint8Array {
  const chunks = parts.map((p) =>
    typeof p === 'string' ? asciiBytes(p) : p instanceof Uint8Array ? p : Uint8Array.from(p),
  );
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** Strict ASCII encoder — anything outside 0x20–0x7E (or LF) becomes '?'. */
function asciiBytes(s: string): Uint8Array {
  const clean = toAscii(s);
  const out = new Uint8Array(clean.length);
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    out[i] = c === 0x0a || (c >= 0x20 && c <= 0x7e) ? c : 0x3f;
  }
  return out;
}

export interface TextFormatOptions {
  encoding: ThermalEncoding;
  /** 1–5; 3 sends nothing (printer default), others emit DC2 # on clone boards. */
  density: number;
  feedLines: number;
  autoCut: boolean;
}

/**
 * "Modern" — styled ESC/POS: init, codepage, alignment, bold, double-size
 * header lines, ESC d feed and partial cut.
 */
export function buildModern(lines: ReceiptLine[], opts: TextFormatOptions): Uint8Array {
  const parts: (number[] | Uint8Array | string)[] = [];
  parts.push([ESC, 0x40]); // ESC @ init
  // ESC t codepage: 0 = CP437, 2 = CP850. UTF-8 mode sends no codepage select.
  if (opts.encoding === 'cp437') parts.push([ESC, 0x74, 0x00]);
  else if (opts.encoding === 'cp850') parts.push([ESC, 0x74, 0x02]);
  // Density on clone boards (DC2 #). 3 = neutral, send nothing.
  if (opts.density >= 1 && opts.density <= 5 && opts.density !== 3) {
    parts.push([0x12, 0x23, opts.density]);
  }

  let align: ReceiptLine['align'] = 'left';
  let bold = false;
  let double = false;
  for (const l of lines) {
    if (l.align !== align) {
      parts.push([ESC, 0x61, l.align === 'center' ? 1 : l.align === 'right' ? 2 : 0]);
      align = l.align;
    }
    if (l.bold !== bold) {
      parts.push([ESC, 0x45, l.bold ? 1 : 0]);
      bold = l.bold;
    }
    if (l.double !== double) {
      parts.push([GS, 0x21, l.double ? 0x11 : 0x00]); // GS ! width+height doubling
      double = l.double;
    }
    parts.push(l.text, [0x0a]);
  }
  // Reset styles, feed and cut.
  parts.push([ESC, 0x61, 0], [ESC, 0x45, 0], [GS, 0x21, 0]);
  if (opts.feedLines > 0) parts.push([ESC, 0x64, Math.min(8, opts.feedLines)]); // ESC d n
  if (opts.autoCut) parts.push([GS, 0x56, 0x42, 0x00]); // GS V B 0 partial cut
  return bytes(...parts);
}

/**
 * "Old" — pure printable ASCII + LF. No styling, no ESC d (bare newlines for
 * the trailing feed), centering via space padding — maximum compatibility.
 */
export function buildOld(plainText: string, feedLines: number): Uint8Array {
  const trailing = '\n'.repeat(Math.max(1, Math.min(8, feedLines || 1)));
  return bytes([ESC, 0x40], plainText, trailing);
}

/** Native-style language probe: identifies ESC/POS vs CPCL vs TSPL printers. */
export function buildTestLine(): Uint8Array {
  const cpcl = '! 0 200 200 60 1\r\nTEXT 4 0 10 10 CPCL PRINTS\r\nFORM\r\nPRINT\r\n';
  const tspl = 'SIZE 48 mm,10 mm\r\nCLS\r\nTEXT 10,10,"2",0,1,1,"TSPL PRINTS"\r\nPRINT 1\r\n';
  return bytes(
    [ESC, 0x40],
    'Hello World 1234567890\n',
    'If you can read this, ESC/POS works.\n\n\n',
    cpcl,
    tspl,
  );
}
