import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { formatCurrency, formatNumber } from '@/utils/format';
import { printHtml } from '@/utils/share';

export interface ReportColumn {
  key: string;
  label: string;
  /** Right-align and format as a plain number. */
  numeric?: boolean;
  /** Right-align and format as currency (₹). */
  currency?: boolean;
  /** Include a summed total for this column in the footer. */
  total?: boolean;
}

export type ReportRow = Record<string, string | number>;

/** Download rows as a CSV file (Excel-friendly, UTF-8 BOM). */
export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const isRight = (c: ReportColumn) => Boolean(c.numeric || c.currency);
const display = (c: ReportColumn, v: string | number) =>
  c.currency ? formatCurrency(Number(v) || 0, false) : c.numeric ? formatNumber(Number(v) || 0) : String(v ?? '');

// ---- Date-range presets (Today, This Month, Fiscal Year, …) ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Local (not UTC) YYYY-MM-DD so ranges match the user's calendar day. */
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Pretty label for a preset's resolved date, e.g. "15 Jul 2025". */
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};

export interface DateRangePreset { key: string; label: string; from: string; to: string; }

/** Build the standard preset ranges relative to today (Indian fiscal year Apr–Mar). */
export function buildDateRangePresets(now = new Date()): DateRangePreset[] {
  const y = now.getFullYear();
  const mo = now.getMonth();
  const today = new Date(y, mo, now.getDate());
  const range = (a: Date, b: Date): Pick<DateRangePreset, 'from' | 'to'> => ({ from: isoLocal(a), to: isoLocal(b) });

  // Week starts Monday.
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  // Quarter bounds.
  const qStart = new Date(y, Math.floor(mo / 3) * 3, 1);
  const prevQEnd = addDays(qStart, -1);
  const prevQStart = new Date(prevQEnd.getFullYear(), Math.floor(prevQEnd.getMonth() / 3) * 3, 1);
  // Indian fiscal year: Apr 1 – Mar 31.
  const fyStartYear = mo >= 3 ? y : y - 1;
  const fyStart = new Date(fyStartYear, 3, 1);
  const fyEnd = new Date(fyStartYear + 1, 2, 31);
  const prevFyStart = new Date(fyStartYear - 1, 3, 1);
  const prevFyEnd = new Date(fyStartYear, 2, 31);

  return [
    { key: 'today', label: 'Today', ...range(today, today) },
    { key: 'yesterday', label: 'Yesterday', ...range(addDays(today, -1), addDays(today, -1)) },
    { key: 'this_week', label: 'This Week', ...range(monday, today) },
    { key: 'last_week', label: 'Last Week', ...range(addDays(monday, -7), addDays(monday, -1)) },
    { key: 'last_7', label: 'Last 7 Days', ...range(addDays(today, -6), today) },
    { key: 'this_month', label: 'This Month', ...range(new Date(y, mo, 1), today) },
    { key: 'prev_month', label: 'Previous Month', ...range(new Date(y, mo - 1, 1), new Date(y, mo, 0)) },
    { key: 'last_30', label: 'Last 30 Days', ...range(addDays(today, -29), today) },
    { key: 'this_quarter', label: 'This Quarter', ...range(qStart, today) },
    { key: 'prev_quarter', label: 'Previous Quarter', ...range(prevQStart, prevQEnd) },
    { key: 'this_fy', label: 'Current Fiscal Year', ...range(fyStart, fyEnd) },
    { key: 'prev_fy', label: 'Previous Fiscal Year', ...range(prevFyStart, prevFyEnd) },
    { key: 'last_365', label: 'Last 365 Days', ...range(addDays(today, -364), today) },
  ];
}

/**
 * Date-range filter shown as a preset dropdown (Today, This Month, Fiscal Year,
 * Last 365 Days, …) with a Custom option that reveals two date inputs. Emits the
 * resolved from/to so every report keeps working unchanged.
 */
export function DateRangeFilter({
  from, to, onFrom, onTo,
}: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const presets = useMemo(() => buildDateRangePresets(), []);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [customMode, setCustomMode] = useState(false);

  const active = presets.find((p) => p.from === from && p.to === to);
  const isCustom = customMode || !active;
  const label = isCustom ? 'Custom' : active!.label;

  const pick = (p: DateRangePreset) => { onFrom(p.from); onTo(p.to); setCustomMode(false); setAnchor(null); };

  return (
    <>
      <Button
        size="small" variant="outlined" color="inherit"
        startIcon={<CalendarMonthRoundedIcon />} endIcon={<ExpandMoreRoundedIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none', fontWeight: 700, borderColor: 'divider', minWidth: 168, justifyContent: 'space-between' }}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 380 } } }}>
        {presets.map((p) => (
          <MenuItem key={p.key} selected={!isCustom && active?.key === p.key} onClick={() => pick(p)} sx={{ gap: 3, justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {prettyDate(p.from)} – {prettyDate(p.to)}
            </Typography>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem selected={isCustom} onClick={() => { setCustomMode(true); setAnchor(null); }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Custom…</Typography>
        </MenuItem>
      </Menu>
      {isCustom && (
        <>
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => onFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => onTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </>
      )}
    </>
  );
}

/** Default range = first day of the current month → today (matches the "This Month" preset). */
export function useMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(isoLocal(first));
  const [to, setTo] = useState(isoLocal(now));
  return { from, to, setFrom, setTo };
}

/** True when `date` (YYYY-MM-DD) is within [from,to] inclusive (blank bounds = open). */
export function inRange(date: string, from: string, to: string): boolean {
  const d = (date ?? '').slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/**
 * Standard report frame: back nav, title, a filter/export bar, and a table with
 * an optional totals footer. CSV + Print are generated from the same columns/rows.
 */
export function ReportShell({
  title, description, meta, columns, rows, filters, loading, emptyText = 'No data for the selected filters.',
}: {
  title: string;
  description?: string;
  meta?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  filters?: ReactNode;
  loading?: boolean;
  emptyText?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Go back to wherever the user came from (preserves the selected module on the
  // Reports page); fall back to the Reports landing on a direct/fresh load.
  const goBack = () => (location.key === 'default' ? navigate('/reports') : navigate(-1));

  const totals = columns.map((c) =>
    c.total ? rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) : null,
  );
  const hasTotals = totals.some((t) => t !== null);

  const exportFile = () => {
    exportCsv(
      `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`,
      columns.map((c) => c.label),
      rows.map((r) => columns.map((c) => r[c.key] ?? '')),
    );
  };

  const print = () => {
    const head = columns.map((c) => `<th class="${isRight(c) ? 'right' : ''}">${c.label}</th>`).join('');
    const body = rows
      .map((r) => `<tr>${columns.map((c) => `<td class="${isRight(c) ? 'right' : ''}">${display(c, r[c.key])}</td>`).join('')}</tr>`)
      .join('');
    const foot = hasTotals
      ? `<tr>${columns.map((c, i) => `<td class="total ${isRight(c) ? 'right' : ''}">${i === 0 && totals[i] === null ? 'Total' : totals[i] !== null ? display(c, totals[i] as number) : ''}</td>`).join('')}</tr>`
      : '';
    printHtml(title, `<h2>${title}</h2>${meta ? `<p class="muted">${meta}</p>` : ''}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table>`);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton onClick={goBack} aria-label="back" size="small"><ArrowBackRoundedIcon /></IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }} noWrap>{title}</Typography>
          {description && <Typography variant="caption" color="text.secondary">{description}</Typography>}
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {filters}
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" startIcon={<DownloadRoundedIcon />} variant="outlined" onClick={exportFile} disabled={rows.length === 0}>Export CSV</Button>
          <Button size="small" startIcon={<PrintRoundedIcon />} variant="outlined" onClick={print} disabled={rows.length === 0}>Print</Button>
        </Stack>
      </Paper>

      {loading && <LinearProgress />}

      {/* At-a-glance summary cards for the totalled columns. */}
      {rows.length > 0 && hasTotals && (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fit, minmax(150px, 1fr))' } }}>
          <SummaryCard label="Records" value={formatNumber(rows.length)} />
          {columns.map((c, i) => (totals[i] === null ? null : (
            <SummaryCard key={c.key} label={c.label} value={display(c, totals[i] as number)} accent={c.currency} />
          )))}
        </Box>
      )}

      <Card>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
          <Typography variant="caption" color="text.secondary">{rows.length} record{rows.length === 1 ? '' : 's'}{meta ? ` · ${meta}` : ''}</Typography>
          {rows.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{emptyText}</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto', mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        align={isRight(c) ? 'right' : 'left'}
                        sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: (t) => alpha(t.palette.primary.main, 0.06), color: 'text.secondary', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}
                      >
                        {c.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} hover sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
                      {columns.map((c) => <TableCell key={c.key} align={isRight(c) ? 'right' : 'left'} sx={{ whiteSpace: 'nowrap', fontWeight: c.currency ? 600 : 400 }}>{display(c, r[c.key])}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
                {hasTotals && (
                  <TableFooter>
                    <TableRow>
                      {columns.map((c, i) => (
                        <TableCell key={c.key} align={isRight(c) ? 'right' : 'left'} sx={{ fontWeight: 800, color: 'text.primary', fontSize: 13, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), borderTop: '2px solid', borderColor: 'divider' }}>
                          {i === 0 && totals[i] === null ? 'Total' : totals[i] !== null ? display(c, totals[i] as number) : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

/** Compact KPI tile shown above a report's table for its summed columns. */
function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 2, ...(accent ? { bgcolor: (t) => alpha(t.palette.primary.main, 0.08), borderColor: 'primary.light' } : {}) }}
    >
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color: accent ? 'primary.main' : 'text.primary' }} noWrap>{value}</Typography>
    </Paper>
  );
}

/** Small inline select used as a report filter. */
export function FilterSelect({
  label, value, onChange, options, allLabel = 'All',
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel?: string }) {
  return (
    <TextField
      size="small" select label={label} value={value} onChange={(e) => onChange(e.target.value)}
      SelectProps={{ native: true }} sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </TextField>
  );
}
