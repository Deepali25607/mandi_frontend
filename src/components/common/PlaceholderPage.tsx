import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

/**
 * Stand-in for BRD modules that are scaffolded in navigation but not yet built.
 * Keeps the app shell fully navigable while we implement modules incrementally.
 */
export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card sx={{ maxWidth: 560, mx: 'auto', mt: { xs: 2, md: 6 } }}>
      <CardContent sx={{ textAlign: 'center', py: 5 }}>
        <Stack spacing={2} alignItems="center">
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: '#fdf3dd',
              color: 'secondary.main',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <ConstructionRoundedIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h5">{title}</Typography>
          <Chip label="Coming soon" color="secondary" size="small" sx={{ fontWeight: 700 }} />
          <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
            {description ??
              'This module is part of the planned roadmap and will be built in an upcoming iteration.'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
