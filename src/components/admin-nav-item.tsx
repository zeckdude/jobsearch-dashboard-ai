"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { navItemSx } from "@/components/nav-item-styles";
import { useAdminNavVisible } from "@/components/use-admin-nav-visible";

export function AdminNavItem() {
  const pathname = usePathname();
  const visible = useAdminNavVisible();
  if (!visible) return null;

  const selected = pathname.startsWith("/admin") || pathname.startsWith("/design-system");

  return (
    <ListItemButton
      component={Link}
      href="/admin"
      selected={selected}
      sx={{
        ...navItemSx,
        mb: 0.35,
        pl: 1.5,
        mt: 0.75,
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: selected ? "inherit" : "text.secondary" }}>
        <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20 }} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Stack spacing={0.05}>
            <Typography component="span" sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>
              Admin
            </Typography>
            <Typography
              component="span"
              variant="caption"
              color={selected ? "primary.dark" : "text.secondary"}
              sx={{ lineHeight: 1.15 }}
            >
              Tools & design system
            </Typography>
          </Stack>
        }
      />
    </ListItemButton>
  );
}
