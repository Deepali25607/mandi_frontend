/**
 * Fixed palette for the Khata screens. These are intentionally independent of
 * the org-configurable MUI theme so the ledger keeps its familiar look
 * (blue header, red "you will get", green "you will got").
 */
export const KHATA = {
  blue: '#0d47a1',
  blueDark: '#0a3d8f',
  tabAccent: '#f5a623',
  red: '#c41230',
  redSoft: '#fdf2f2',
  redPill: '#fdecec',
  green: '#0f7b4f',
  greenSoft: '#f1f8f5',
  magenta: '#b0165a',
  bg: '#f2f3f5',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#1f2933',
  muted: '#6b7280',
  link: '#0d47a1',
  avatarBg: '#e9edf2',
  reportStrip: '#e7eefb',
  reminderStrip: '#e9f0fb',
  sheetHandle: '#d1d5db',
} as const;

/** Phone-sized column: the layout is a faithful mobile design even on desktop. */
export const KHATA_MAX_WIDTH = 480;
