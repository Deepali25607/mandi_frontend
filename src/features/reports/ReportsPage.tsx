import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useAppSelector } from '@/store/hooks';
import {
  MODULE_META, MODULE_ORDER, REPORTS, type ReportDef, type ReportModule,
} from './reportsRegistry';

export default function ReportsPage() {
  const navigate = useNavigate();
  const features = useAppSelector((s) => s.auth.user?.features) ?? [];

  // Hide reports whose subscription feature the org's plan doesn't include.
  const grouped = useMemo(() => {
    const visible = REPORTS.filter((r) => !r.feature || features.includes(r.feature));
    const map = new Map<ReportModule, ReportDef[]>();
    for (const r of visible) {
      if (!map.has(r.module)) map.set(r.module, []);
      map.get(r.module)!.push(r);
    }
    return MODULE_ORDER.filter((m) => map.has(m)).map((m) => [m, map.get(m)!] as const);
  }, [features]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Module-wise reports with filters and CSV / print export. Pick a report to view.
        </Typography>
      </Box>

      {grouped.map(([module, reports]) => {
        const Icon = MODULE_META[module].icon;
        return (
          <Box key={module}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}><Icon /></Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1 }}>{module}</Typography>
                <Typography variant="caption" color="text.secondary">{MODULE_META[module].blurb}</Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Chip size="small" label={`${reports.length}`} />
            </Stack>
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
          </Box>
        );
      })}
    </Stack>
  );
}
