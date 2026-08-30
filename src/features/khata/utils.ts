import type { LedgerRow, Party } from './types';

/** "₹ 4,50,757" — Indian grouping, no paise unless present, space after the symbol. */
export function formatKhataAmount(value: number): string {
  const abs = Math.abs(value);
  const num = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(abs);
  return `₹ ${num}`;
}

/** Initials for the avatar: first char of the first two words ("Maa Durga" → "MD"). */
export function partyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

/** Relative age like the reference app: "today", "5 days ago", "19 months ago", "2 years ago". */
export function timeAgo(iso: string, now = new Date()): string {
  const days = daysBetween(new Date(iso), now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365.25);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** "20 Jan 25" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

/** "05:37 PM" — ERP documents carry a date only, so this is blank for midnight stamps. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** yyyy-mm-dd of a timestamp in local time. */
export function dateKey(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Today as yyyy-mm-dd (local). */
export function todayKey(): string {
  return dateKey(new Date().toISOString());
}

/** Group newest-first rows by calendar day, preserving order. */
export function groupRowsByDay(rows: LedgerRow[]): { key: string; iso: string; rows: LedgerRow[] }[] {
  const groups: { key: string; iso: string; rows: LedgerRow[] }[] = [];
  for (const row of rows) {
    const key = dateKey(row.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, iso: row.at, rows: [row] });
  }
  return groups;
}

export interface PartySummary {
  party: Party;
  balance: number;
  /** ISO date of the latest transaction; undefined when the party has none. */
  lastActivity?: string;
  entryCount: number;
}

/** Dashboard totals: "You will give" (sum of negatives) / "You will get" (sum of positives). */
export function totals(summaries: PartySummary[]): { give: number; get: number } {
  return summaries.reduce(
    (acc, s) => {
      if (s.balance > 0) acc.get += s.balance;
      else acc.give += -s.balance;
      return acc;
    },
    { give: 0, get: 0 },
  );
}

/** Digits-only phone for tel:/wa.me links. */
export function phoneDigits(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

/** Human label for where a ledger line came from. */
export function sourceLabel(source: LedgerRow['source']): string {
  switch (source) {
    case 'sale': return 'Credit sale';
    case 'collection': return 'Payment received';
    case 'bill': return 'Settlement bill';
    case 'payment': return 'Payment made';
    case 'adjustment': return 'Rate / weight adjustment';
    default: return 'Opening balance';
  }
}
