import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  ListItemIcon,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import { useAppSelector } from '@/store/hooks';
import {
  MODULE_META, MODULE_ORDER, REPORTS, type ReportDef, type ReportModule,
} from './reportsRegistry';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const features = useAppSelector((s) => s.auth.user?.features) ?? [];

  // Reports grouped by module, hiding any whose subscription feature the plan lacks.
  const grouped = useMemo(() => {
    const visible = REPORTS.filter((r) => !r.feature || features.includes(r.feature));
    const map = new Map<ReportModule, ReportDef[]>();
    for (const r of visible) {
      if (!map.has(r.module)) map.set(r.module, []);
      map.get(r.module)!.push(r);
    }
    return map;
  }, [features]);

  const modules = MODULE_ORDER.filter((m) => grouped.has(m));

  // Selected module lives in the URL (?module=Sales) so it survives back-nav from
  // a report and is bookmarkable. Falls back to the first available module.
  const requested = params.get('module') as ReportModule | null;
  const selected: ReportModule | undefined =
    requested && grouped.has(requested) ? requested : modules[0];

  if (modules.length === 0) {
    return (
      <Stack spacing={1}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          No reports are available on your current plan.
        </Typography>
      </Stack>
    );
  }

  const reports = selected ? grouped.get(selected) ?? [] : [];
  const SelectedIcon = selected ? MODULE_META[selected].icon : AssessmentRoundedIcon;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a module to see its reports. Each report has filters and CSV / print export.
        </Typography>
      </Box>

      {/* Module picker */}
      <TextField
        select
        label="Module"
        value={selected ?? ''}
        onChange={(e) => setParams({ module: e.target.value }, { replace: true })}
        sx={{ maxWidth: 380 }}
      >
        {modules.map((m) => {
          const Icon = MODULE_META[m].icon;
          return (
            <MenuItem key={m} value={m}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}><Icon /></ListItemIcon>
                <Box sx={{ flexGrow: 1 }}>{m}</Box>
                <Chip size="small" label={grouped.get(m)!.length} sx={{ height: 20 }} />
              </Box>
            </MenuItem>
          );
        })}
      </TextField>

      {/* Selected module header */}
      {selected && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}><SelectedIcon /></Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1 }}>{selected}</Typography>
            <Typography variant="caption" color="text.secondary">{MODULE_META[selected].blurb}</Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Chip size="small" label={`${reports.length} report${reports.length === 1 ? '' : 's'}`} />
        </Stack>
      )}

      {/* Reports for the selected module */}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' } }}>
        {reports.map((r) => (
          <Card key={r.key} variant="outlined">
            <CardActionArea onClick={() => navigate(`/reports/${r.key}`)} sx={{ p: 1.5, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                </Box>
                <ChevronRightRoundedIcon color="action" />
              </Stack>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
