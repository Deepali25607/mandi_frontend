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

/** Print a given HTML fragment via a hidden iframe (no new tab/popup blocker). */
export function printHtml(title: string, bodyHtml: string) {
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
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;color:#1c2522;padding:24px;}
      h1,h2,h3{margin:0 0 4px;}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;}
      th{background:#f3f4f6;}
      .right{text-align:right;}
      .muted{color:#6b7280;}
      .total{font-weight:700;}
    </style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  frame.contentWindow?.focus();
  setTimeout(() => {
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 500);
  }, 250);
}
