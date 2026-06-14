import { useState, type ReactNode } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';

export interface EntityChip {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

interface EntityCardProps {
  avatarText: string;
  title: string;
  subtitle?: ReactNode;
  chips?: EntityChip[];
  meta?: ReactNode;
  inactive?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
}

export default function EntityCard({
  avatarText,
  title,
  subtitle,
  chips,
  meta,
  inactive,
  onEdit,
  onArchive,
}: EntityCardProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const hasMenu = Boolean(onEdit || onArchive);

  return (
    <Card sx={{ opacity: inactive ? 0.55 : 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <CardActionArea
          onClick={onEdit}
          disabled={!onEdit}
          sx={{ p: 1.5, borderRadius: 0, flexGrow: 1 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.light', fontWeight: 700 }}>{avatarText}</Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>
                  {title}
                </Typography>
                {chips?.map((c, i) => (
                  <Chip key={i} size="small" label={c.label} color={c.color ?? 'default'} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />
                ))}
              </Stack>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {meta && <Box sx={{ textAlign: 'right', flexShrink: 0 }}>{meta}</Box>}
          </Stack>
        </CardActionArea>
        {hasMenu && (
          <>
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ mr: 0.5 }}>
              <MoreVertRoundedIcon />
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              {onEdit && (
                <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>
                  <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
                  Edit
                </MenuItem>
              )}
              {onArchive && (
                <MenuItem onClick={() => { setAnchor(null); onArchive(); }}>
                  <ListItemIcon><ArchiveRoundedIcon fontSize="small" /></ListItemIcon>
                  Archive
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>
    </Card>
  );
}
