import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

export default function ChartCard({
  title,
  subtitle,
  height = 260,
  children,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  children: ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ width: '100%', height }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
