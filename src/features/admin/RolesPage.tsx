import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import {
  useCreateCustomRoleMutation,
  useDeleteCustomRoleMutation,
  useGetAssignableScreensQuery,
  useGetCustomRolesQuery,
  useUpdateCustomRoleMutation,
} from '@/api/adminApi';
import { ORG_ROLE_INFO, screensForRole } from '@/config/roles';
import type { AssignableScreen, CustomRole } from '@/types';

const SECTION_ORDER: AssignableScreen['section'][] = ['Operations', 'Masters', 'Accounts', 'Reports'];

type FormState = { name: string; description: string; screens: Set<string> };
const emptyForm = (): FormState => ({ name: '', description: '', screens: new Set() });

export default function RolesPage() {
  const { data: screens } = useGetAssignableScreensQuery();
  const { data: customRoles, isLoading } = useGetCustomRolesQuery();
  const [createRole, { isLoading: creating }] = useCreateCustomRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateCustomRoleMutation();
  const [deleteRole] = useDeleteCustomRoleMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomRole | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, AssignableScreen[]>();
    for (const s of screens ?? []) {
      if (!map.has(s.section)) map.set(s.section, []);
      map.get(s.section)!.push(s);
    }
    return SECTION_ORDER.filter((sec) => map.has(sec)).map((sec) => [sec, map.get(sec)!] as const);
  }, [screens]);

  const screenLabel = (path: string) => (screens ?? []).find((s) => s.path === path)?.label ?? path;

  const openAdd = () => {
    setEditing(null);
    setError(null);
    // Pre-check always-on screens (e.g. Dashboard).
    const always = new Set((screens ?? []).filter((s) => s.always).map((s) => s.path));
    setForm({ name: '', description: '', screens: always });
    setOpen(true);
  };
  const openEdit = (r: CustomRole) => {
    setEditing(r);
    setError(null);
    setForm({ name: r.name, description: r.description ?? '', screens: new Set(r.screens) });
    setOpen(true);
  };

  const toggleScreen = (path: string) =>
    setForm((f) => {
      const next = new Set(f.screens);
      next.has(path) ? next.delete(path) : next.add(path);
      return { ...f, screens: next };
    });

  const realScreenCount = (paths: string[]) =>
    paths.filter((p) => !(screens ?? []).find((s) => s.path === p)?.always).length;

  const save = async () => {
    setError(null);
    const chosen = [...form.screens];
    if (realScreenCount(chosen) === 0) {
      setError('Select at least one screen for this role.');
      return;
    }
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || undefined, screens: chosen };
      if (editing) await updateRole({ id: editing.id, body }).unwrap();
      else await createRole(body).unwrap();
      setOpen(false);
    } catch (e) {
      const msg = (e as { data?: { message?: string | string[] } })?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not save the role.');
    }
  };

  const toggleActive = (r: CustomRole) => updateRole({ id: r.id, body: { isActive: !r.isActive } });

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleteError(null);
    try {
      await deleteRole(confirmDelete.id).unwrap();
      setConfirmDelete(null);
    } catch (e) {
      const msg = (e as { data?: { message?: string } })?.data?.message;
      setDeleteError(msg ?? 'Could not delete the role.');
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 880, mx: 'auto' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Roles &amp; Access</Typography>
        <Typography variant="body2" color="text.secondary">
          Build your own roles by picking exactly which screens a user can reach, or assign one of the built-in roles.
        </Typography>
      </Box>

      {/* ---- Custom roles manager ---- */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BadgeRoundedIcon color="primary" />
            <Typography sx={{ fontWeight: 800 }}>Custom Roles</Typography>
          </Stack>
          <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={openAdd}>
            New Role
          </Button>
        </Stack>

        {(customRoles ?? []).length === 0 && !isLoading && (
          <Alert severity="info" variant="outlined">
            No custom roles yet. Create one to grant a tailored set of screens — for example a “Front Desk” role with just
            Sale Entry, Customers and Billing.
          </Alert>
        )}

        <Stack spacing={1.25}>
          {(customRoles ?? []).map((r) => (
            <Box key={r.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, opacity: r.isActive ? 1 : 0.6 }}>
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 36, height: 36, fontWeight: 800 }}>
                  {r.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography>
                    {!r.isActive && <Chip size="small" label="Disabled" />}
                    <Chip size="small" variant="outlined" label={`${realScreenCount(r.screens)} screens`} />
                  </Stack>
                  {r.description && (
                    <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                  )}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                    {r.screens
                      .filter((p) => !(screens ?? []).find((s) => s.path === p)?.always)
                      .map((p) => <Chip key={p} size="small" variant="outlined" label={screenLabel(p)} sx={{ height: 22 }} />)}
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Switch size="small" checked={r.isActive} onChange={() => toggleActive(r)} />
                  <IconButton size="small" onClick={() => openEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setDeleteError(null); setConfirmDelete(r); }}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ---- Built-in role guide ---- */}
      <Alert severity="info" icon={<AdminPanelSettingsRoundedIcon />}>
        As <strong>Organization Admin</strong> you have complete access to every module and role and can perform any
        function independently — useful when a team member is unavailable.
      </Alert>

      <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 1 }}>Built-in roles</Typography>
      {ORG_ROLE_INFO.map((role) => {
        const roleScreens = screensForRole(role.value);
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
                    <Chip size="small" variant="outlined" label={`${roleScreens.length} screens`} />
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
                    {roleScreens.map((s) => {
                      const Icon = s.icon;
                      return (
                        <Chip key={s.path} size="small" icon={<Icon />} label={s.label} variant="outlined" sx={{ '& .MuiChip-icon': { fontSize: 16 } }} />
                      );
                    })}
                  </Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Create / edit custom role */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Edit Role' : 'New Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Role name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="e.g. Front Desk" />
            <TextField label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Screens this role can access</Typography>
              <Typography variant="caption" color="text.secondary">
                Tick the screens the user should see. Reads follow the screen; write actions are enforced on the server.
              </Typography>
              {grouped.map(([section, list]) => (
                <Box key={section} sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    {section}
                  </Typography>
                  <FormGroup>
                    {list.map((s) => (
                      <FormControlLabel
                        key={s.path}
                        control={
                          <Checkbox
                            size="small"
                            checked={form.screens.has(s.path)}
                            disabled={s.always}
                            onChange={() => toggleScreen(s.path)}
                          />
                        }
                        label={
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <span>{s.label}</span>
                            {s.always && <Chip size="small" label="always" sx={{ height: 18 }} />}
                            {s.feature && <Chip size="small" variant="outlined" label="plan feature" sx={{ height: 18 }} />}
                          </Stack>
                        }
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </Box>
            {editing && (
              <FormControlLabel
                control={<Switch checked={editing.isActive} disabled />}
                label={editing.isActive ? 'Active' : 'Disabled (toggle from the list)'}
              />
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.name.trim() || creating || updating}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Delete role?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Delete <strong>{confirmDelete?.name}</strong>? This can't be undone. A role that is still assigned to users
            can't be deleted — reassign them first.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
