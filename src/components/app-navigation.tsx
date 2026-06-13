"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  findActiveNavItem,
  isNavItemActive,
  navSections,
  type NavItem,
  type NavSection,
  sectionHasActiveItem,
} from "@/lib/navigation";
import { navItemSx } from "@/components/nav-item-styles";
import { AdminNavItem } from "@/components/admin-nav-item";

function NavLinkItem({
  item,
  selected,
  nested = false,
  onNavigate,
}: {
  item: NavItem;
  selected: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <ListItemButton
      component={Link}
      href={item.href}
      selected={selected}
      onClick={onNavigate}
      sx={{
        ...navItemSx,
        mb: 0.35,
        pl: nested ? 2.25 : 1.5,
        minHeight: nested ? 38 : 40,
      }}
    >
      <ListItemIcon sx={{ minWidth: nested ? 32 : 36, color: selected ? "inherit" : "text.secondary" }}>
        <Icon sx={{ fontSize: nested ? 18 : 20 }} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Stack spacing={0.05}>
            <Typography component="span" sx={{ fontSize: nested ? 13 : 14, fontWeight: 800, lineHeight: 1.25 }}>
              {item.label}
            </Typography>
            <Typography
              component="span"
              variant="caption"
              color={selected ? "primary.dark" : "text.secondary"}
              sx={{ lineHeight: 1.15, display: { xs: "block", lg: nested ? "block" : "block" } }}
            >
              {item.eyebrow}
            </Typography>
          </Stack>
        }
      />
    </ListItemButton>
  );
}

function DesktopNavSection({
  section,
  expanded,
  onToggle,
  pathname,
}: {
  section: NavSection;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const SectionIcon = section.icon;
  const activeItem = section.items.find((item) => isNavItemActive(pathname, item));
  const sectionActive = Boolean(activeItem);

  return (
    <Box sx={{ mb: 0.75 }}>
      <ListItemButton
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{
          ...navItemSx,
          mb: 0.25,
          py: 0.75,
          bgcolor: sectionActive && !expanded ? "rgba(15, 118, 110, 0.06)" : "transparent",
          borderColor: sectionActive && !expanded ? "rgba(15, 118, 110, 0.18)" : "transparent",
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: sectionActive ? "primary.dark" : "text.secondary" }}>
          <SectionIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={
            <Stack spacing={0.1}>
              <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", lineHeight: 1.2 }}>
                {section.label}
              </Typography>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ lineHeight: 1.15 }}>
                {expanded ? section.eyebrow : activeItem ? `→ ${activeItem.label}` : section.eyebrow}
              </Typography>
            </Stack>
          }
        />
        <IconButton
          size="small"
          aria-label={expanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          sx={{ ml: 0.5 }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </ListItemButton>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 0.75 }}>
          {section.items.map((item) => (
            <NavLinkItem key={item.href} item={item} selected={isNavItemActive(pathname, item)} nested />
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

export function DesktopAppNavigation() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navSections.map((section) => [section.id, sectionHasActiveItem(pathname, section)])),
  );

  useEffect(() => {
    setExpandedSections((previous) => {
      const next = { ...previous };
      for (const section of navSections) {
        if (sectionHasActiveItem(pathname, section)) {
          next[section.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  return (
    <List sx={{ p: 1.5, pt: 1 }}>
      {navSections.map((section) => (
        <DesktopNavSection
          key={section.id}
          section={section}
          pathname={pathname}
          expanded={expandedSections[section.id] ?? false}
          onToggle={() => setExpandedSections((previous) => ({ ...previous, [section.id]: !previous[section.id] }))}
        />
      ))}
      <AdminNavItem />
    </List>
  );
}

function MobileNavSection({ section, pathname }: { section: NavSection; pathname: string }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const SectionIcon = section.icon;
  const activeItem = section.items.find((item) => isNavItemActive(pathname, item));
  const sectionActive = Boolean(activeItem);

  return (
    <>
      <Tooltip title={activeItem ? `${section.label}: ${activeItem.label}` : section.label}>
        <IconButton
          aria-label={section.label}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchorEl)}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          color={sectionActive ? "primary" : "default"}
          sx={{
            flex: "0 0 auto",
            width: 44,
            height: 44,
            borderRadius: 2,
            border: "1px solid",
            borderColor: sectionActive ? "primary.main" : "divider",
            bgcolor: sectionActive ? "#e6f5f3" : "transparent",
          }}
        >
          <SectionIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 0.5 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 900, letterSpacing: 0.4 }}>
            {section.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {section.eyebrow}
          </Typography>
        </Box>
        <Divider />
        {section.items.map((item) => {
          const Icon = item.icon;
          const selected = isNavItemActive(pathname, item);

          return (
            <MenuItem
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              onClick={() => setAnchorEl(null)}
              sx={{ py: 1.1, alignItems: "flex-start" }}
            >
              <ListItemIcon sx={{ minWidth: 34, mt: 0.2, color: selected ? "primary.dark" : "text.secondary" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontWeight: 800, fontSize: 14 }}>{item.label}</Typography>}
                secondary={item.eyebrow}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export function MobileAppNavigation() {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <Stack spacing={0.75}>
      {active ? (
        <Box sx={{ px: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
            {active.section.label} · {active.item.label}
          </Typography>
        </Box>
      ) : null}
      <Box
        component="nav"
        aria-label="Mobile navigation"
        sx={{
          display: "flex",
          gap: 0.75,
          overflowX: "auto",
          px: 1,
          pb: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {navSections.map((section) => (
          <MobileNavSection key={section.id} section={section} pathname={pathname} />
        ))}
      </Box>
    </Stack>
  );
}
