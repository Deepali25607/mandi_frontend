import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { resetAppearance, setAppearance } from '@/store/appearanceSlice';
import { useGetAppearanceQuery } from '@/api/appearanceApi';
import { wallpaperSx } from '@/theme/wallpaper';
import { sidebarPalette } from '@/theme/sidebar';
import { DEFAULT_APPEARANCE } from '@/types/appearance';
import SubscriptionBanner from '@/components/common/SubscriptionBanner';
import { navItemsForRole, type NavItem } from './navConfig';

const SIDEBAR_WIDTH = 264;

export default function AppShell() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const appearance = useAppSelector((s) => s.appearance.config);

  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuEl, setUserMenuEl] = useState<null | HTMLElement>(null);
  // Collapsible sidebar sections. A section defaults to open when it holds the
  // current route; an explicit user toggle overrides that default.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Load the tenant's saved Theme & Wallpaper once authenticated (org users only;
  // the platform Super Admin has no organization). The cached config from
  // localStorage paints first; this reconciles it with the server copy.
  const { data: savedAppearance } = useGetAppearanceQuery(undefined, {
    skip: !user?.organizationId,
  });
  useEffect(() => {
    // Merge with defaults so older saved configs (missing newer keys) still apply.
    if (savedAppearance) dispatch(setAppearance({ ...DEFAULT_APPEARANCE, ...savedAppearance }));
  }, [savedAppearance, dispatch]);

  if (!user) return null;

  const items = navItemsForRole(user.role, user.features ?? [], user.grantedScreens);
  // Pick the longest matching path so nested routes (e.g. /platform/organizations)
  // resolve to their own item rather than the /platform parent.
  const current =
    items
      .filter((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/') || location.pathname.startsWith(i.path))
      .sort((a, b) => b.path.length - a.path.length)[0] ?? items[0];

  // Mobile bottom bar: up to 4 primary items the user can access + a "More" tab.
  const bottomItems = items.filter((i) => i.primary).slice(0, 4);
  const showMoreTab = items.length > bottomItems.length;

  const go = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetAppearance());
    navigate('/login', { replace: true });
  };

  const grouped = groupBySection(items);
  const sb = sidebarPalette(appearance.sidebar, theme);

  const navList = (onItemClick: (path: string) => void) => (
    <List sx={{ py: 1 }}>
      {grouped.map(([section, sectionItems]) => {
        const open = openSections[section] ?? section === current?.section;
        return (
          <Box key={section}>
            {/* Section header — click to expand/collapse this module group. */}
            <ListItemButton
              onClick={() => setOpenSections((prev) => ({ ...prev, [section]: !open }))}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: 2,
                color: sb.subheaderColor,
                '&:hover': { bgcolor: sb.hoverBg },
              }}
            >
              <ListItemText
                primary={section}
                primaryTypographyProps={{
                  fontWeight: 700,
                  variant: 'body2',
                  sx: { textTransform: 'uppercase', letterSpacing: 0.5 },
                }}
              />
              {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
            </ListItemButton>

            <Collapse in={open} timeout="auto" unmountOnExit>
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const active = item.path === current?.path;
                return (
                  <ListItemButton
                    key={item.path}
                    onClick={() => onItemClick(item.path)}
                    selected={active}
                    sx={{
                      mx: 1,
                      my: 0.25,
                      pl: 3,
                      borderRadius: 2,
                      color: sb.color,
                      '&:hover': { bgcolor: sb.hoverBg },
                      '&.Mui-selected': {
                        bgcolor: sb.selectedBg,
                        color: sb.selectedColor,
                        '& .MuiListItemIcon-root': { color: sb.selectedColor },
                        '&:hover': { bgcolor: sb.selectedHoverBg },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: active ? 'inherit' : sb.iconColor }}>
                      <Icon />
                    </ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
                  </ListItemButton>
                );
              })}
            </Collapse>
          </Box>
        );
      })}
    </List>
  );

  const brand = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 2, color: sb.color }}>
      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 40, height: 40 }}>
        <StorefrontRoundedIcon />
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          Mandi ERP
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: sb.subheaderColor }}>
          {user.organizationId ? 'Trading Workspace' : 'Platform Admin'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', ...wallpaperSx(appearance) }}>
      {/* Desktop permanent sidebar */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              borderRight: '1px solid',
              borderColor: sb.borderColor,
              bgcolor: sb.bg,
              color: sb.color,
            },
          }}
        >
          {brand}
          <Divider sx={{ borderColor: sb.borderColor }} />
          {navList(go)}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMoreOpen(true)} aria-label="menu">
                <MenuRoundedIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }} noWrap>
              {current?.label ?? 'Dashboard'}
            </Typography>
            <IconButton onClick={(e) => setUserMenuEl(e.currentTarget)} aria-label="account">
              <Avatar sx={{ bgcolor: 'secondary.main', color: '#1a1a1a', width: 36, height: 36, fontWeight: 700 }}>
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={userMenuEl}
              open={Boolean(userMenuEl)}
              onClose={() => setUserMenuEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.roleLabel} · @{user.username}
                </Typography>
                {user.subscription?.planName && (
                  <Box sx={{ mt: 0.75 }}>
                    <Chip
                      size="small"
                      color={user.subscription.status === 'active' ? 'success' : user.subscription.status === 'trial' ? 'info' : 'default'}
                      label={`${user.subscription.planName} · ${user.subscription.status ?? ''}`}
                      sx={{ height: 22, fontWeight: 700, textTransform: 'capitalize' }}
                    />
                  </Box>
                )}
              </Box>
              <Divider />
              <MenuItem onClick={() => { setUserMenuEl(null); navigate('/account'); }}>
                <ListItemIcon>
                  <ManageAccountsRoundedIcon fontSize="small" />
                </ListItemIcon>
                Account &amp; Security
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutRoundedIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Subscription lock / trial-ending banner (org users only). */}
        <SubscriptionBanner />

        {/* Page content. Bottom padding on mobile clears the bottom nav. */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            pb: { xs: 12, md: 3 },
            maxWidth: 1280,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Mobile bottom navigation */}
      {!isDesktop && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: (t) => t.zIndex.appBar,
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            showLabels
            value={current?.path ?? false}
            onChange={(_, value) => {
              if (value === '__more__') setMoreOpen(true);
              else go(value);
            }}
          >
            {bottomItems.map((item) => {
              const Icon = item.icon;
              return (
                <BottomNavigationAction
                  key={item.path}
                  label={item.label}
                  value={item.path}
                  icon={<Icon />}
                />
              );
            })}
            {showMoreTab && (
              <BottomNavigationAction label="More" value="__more__" icon={<MoreHorizRoundedIcon />} />
            )}
          </BottomNavigation>
        </Paper>
      )}

      {/* Mobile "more" drawer with the full grouped menu */}
      <Drawer
        anchor="left"
        open={moreOpen && !isDesktop}
        onClose={() => setMoreOpen(false)}
        PaperProps={{ sx: { width: 300, bgcolor: sb.bg, color: sb.color } }}
      >
        {brand}
        <Divider sx={{ borderColor: sb.borderColor }} />
        {navList(go)}
      </Drawer>
    </Box>
  );
}

function groupBySection(items: NavItem[]): [string, NavItem[]][] {
  const order = ['Platform', 'Operations', 'Masters', 'Accounts', 'Reports', 'Admin'];
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    if (!map.has(item.section)) map.set(item.section, []);
    map.get(item.section)!.push(item);
  }
  return order
    .filter((s) => map.has(s))
    .map((s) => [s, map.get(s)!] as [string, NavItem[]]);
}
