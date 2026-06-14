import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
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

/** Date-range filter (two native date inputs) used by most registers. */
export function DateRangeFilter({
  from, to, onFrom, onTo,
}: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <>
      <TextField size="small" type="date" label="From" value={from} onChange={(e) => onFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
      <TextField size="small" type="date" label="To" value={to} onChange={(e) => onTo(e.target.value)} InputLabelProps={{ shrink: true }} />
    </>
  );
}

/** Default range = first day of the current month → today. */
export function useMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(first));
  const [to, setTo] = useState(iso(now));
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
        <IconButton onClick={() => navigate('/reports')} aria-label="back" size="small"><ArrowBackRoundedIcon /></IconButton>
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
                    {columns.map((c) => <TableCell key={c.key} align={isRight(c) ? 'right' : 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} hover>
                      {columns.map((c) => <TableCell key={c.key} align={isRight(c) ? 'right' : 'left'} sx={{ whiteSpace: 'nowrap' }}>{display(c, r[c.key])}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
                {hasTotals && (
                  <TableFooter>
                    <TableRow>
                      {columns.map((c, i) => (
                        <TableCell key={c.key} align={isRight(c) ? 'right' : 'left'} sx={{ fontWeight: 800, color: 'text.primary', fontSize: 13 }}>
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
