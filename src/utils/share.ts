/**
 * WhatsApp share. Uses the public wa.me deep link (works without the Business
 * API) — opens WhatsApp with a prefilled message the user sends manually.
 * The real WhatsApp Business API send is a future server-side integration
 * (see IMPLEMENTATION_LOG).
 */
export function shareOnWhatsApp(message: string, mobile?: string) {
  const phone = mobile ? mobile.replace(/\D/g, '') : '';
  const intl = phone && phone.length === 10 ? `91${phone}` : phone;
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * Print a given HTML fragment via a hidden iframe (no new tab/popup blocker).
 * Pass `css` to fully replace the default A4-ish stylesheet (e.g. for thermal
 * roll widths, where the page size and font must be much narrower).
 */
export function printHtml(title: string, bodyHtml: string, css?: string) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  const defaultCss = `
      body{font-family:'Segoe UI',system-ui,sans-serif;color:#1c2522;padding:24px;}
      h1,h2,h3{margin:0 0 4px;}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;}
      th{background:#f3f4f6;}
      .right{text-align:right;}
      .muted{color:#6b7280;}
      .total{font-weight:700;}`;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title}</title>
    <style>${css ?? defaultCss}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  frame.contentWindow?.focus();
  setTimeout(() => {
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 500);
  }, 250);
}

/** CSS px → mm (CSS defines 1in = 96px = 25.4mm). */
const pxToMm = (px: number) => (px * 25.4) / 96;

/**
 * Print to a continuous thermal roll of a fixed width.
 *
 * `@page { size: <width>mm auto }` is INVALID CSS — `size` takes `auto` OR one/two
 * lengths, never a mix — so browsers drop it and fall back to A4/Letter. Instead we
 * render first, measure the real content height, then inject an exact
 * `size: <width>mm <height>mm` so the sheet matches the receipt and the roll
 * feeds/cuts correctly (this also pins orientation to portrait).
 */
export function printRoll(title: string, bodyHtml: string, css: string, widthMm: number) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  // Give the frame the true paper width so layout/measurement match the print.
  frame.style.width = `${widthMm}mm`;
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!doctype html><html><head><title>${title}</title>
    <style>${css}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();

  const run = () => {
    // Measure after layout, then size the page to the content.
    const contentPx = Math.max(
      doc.body.scrollHeight,
      doc.documentElement.scrollHeight,
    );
    const heightMm = Math.max(30, Math.ceil(pxToMm(contentPx)) + 2);
    const pageStyle = doc.createElement('style');
    pageStyle.textContent = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
    doc.head.appendChild(pageStyle);

    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  };

  // Wait for fonts so the measured height matches what actually prints.
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) fonts.ready.then(() => setTimeout(run, 60)).catch(() => setTimeout(run, 250));
  else setTimeout(run, 250);
}
