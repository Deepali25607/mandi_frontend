import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import { ORG_ROLE_INFO, screensForRole } from '@/config/roles';

export default function RolesPage() {
  return (
    <Stack spacing={2} sx={{ maxWidth: 880, mx: 'auto' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Roles & Access</Typography>
        <Typography variant="body2" color="text.secondary">
          What each role can do and which screens they can reach. Use this when assigning roles to your team.
        </Typography>
      </Box>

      <Alert severity="info" icon={<AdminPanelSettingsRoundedIcon />}>
        As <strong>Organization Admin</strong> you have complete access to every module and role and can perform any
        function independently — useful when a team member is unavailable.
      </Alert>

      {ORG_ROLE_INFO.map((role) => {
        const screens = screensForRole(role.value);
        const isAdmin = role.value === 'org_admin';
        return (
          <Accordion key={role.value} defaultExpanded={isAdmin} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
                <Avatar sx={{ bgcolor: isAdmin ? 'primary.main' : 'secondary.main', color: isAdmin ? '#fff' : '#1a1a1a', width: 36, height: 36, fontWeight: 800 }}>
                  {role.label.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography sx={{ fontWeight: 700 }}>{role.label}</Typography>
                    {isAdmin && <Chip size="small" color="primary" label="Full access" />}
                    <Chip size="small" variant="outlined" label={`${screens.length} screens`} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{role.summary}</Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Responsibilities</Typography>
                  <List dense disablePadding>
                    {role.responsibilities.map((r) => (
                      <ListItem key={r} disableGutters sx={{ py: 0.1 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}><CheckCircleRoundedIcon fontSize="small" color="success" /></ListItemIcon>
                        <ListItemText primary={r} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Accessible screens</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {screens.map((s) => {
                      const Icon = s.icon;
                      return (
                        <Chip
                          key={s.path}
                          size="small"
                          icon={<Icon />}
                          label={s.label}
                          variant="outlined"
                          sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}
