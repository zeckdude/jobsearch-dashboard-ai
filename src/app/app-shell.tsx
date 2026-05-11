"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const drawerWidth = 264;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardOutlinedIcon },
  { href: "/profiles", label: "Profiles", icon: ManageSearchOutlinedIcon },
  { href: "/jobs", label: "Jobs", icon: WorkOutlineOutlinedIcon },
  { href: "/applications", label: "Applications", icon: AssignmentTurnedInOutlinedIcon },
  { href: "/applications/assistant", label: "Apply Sprint", icon: BoltOutlinedIcon },
  { href: "/resumes", label: "Resumes", icon: FactCheckOutlinedIcon },
  { href: "/runs", label: "Runs", icon: HistoryOutlinedIcon },
  { href: "/settings", label: "Settings", icon: SettingsOutlinedIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "linear-gradient(180deg, rgba(15, 118, 110, 0.06) 0px, rgba(15, 118, 110, 0) 240px), linear-gradient(90deg, rgba(37, 99, 235, 0.045) 0px, rgba(37, 99, 235, 0) 360px)",
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            borderRightColor: "divider",
            boxSizing: "border-box",
            bgcolor: "#fbfcfd",
            backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f7fafc 100%)",
          },
        }}
      >
        <Toolbar sx={{ minHeight: 96, px: 3 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                width: 42,
                height: 42,
                boxShadow: "0 10px 24px rgba(15, 118, 110, 0.25)",
              }}
            >
              <AutoAwesomeOutlinedIcon fontSize="small" />
            </Avatar>
            <Stack spacing={0.25}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 900, letterSpacing: 0 }}>
                Job Search OS
              </Typography>
              <Typography variant="h3" sx={{ lineHeight: 1.1 }}>Review Console</Typography>
            </Stack>
          </Stack>
        </Toolbar>
        <Divider />
        <List sx={{ p: 1.5 }}>
          {navItems.map((item) => {
            const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={selected}
                sx={{
                  mb: 0.5,
                  minHeight: 44,
                  color: selected ? "primary.dark" : "text.secondary",
                  border: "1px solid transparent",
                  "&:hover": {
                    bgcolor: "#eef7f6",
                    color: "primary.dark",
                  },
                  "&.Mui-selected": {
                    bgcolor: "#e6f5f3",
                    color: "primary.dark",
                    borderColor: "#b7ded8",
                    "&:hover": { bgcolor: "#d9efec" },
                    "& .MuiListItemIcon-root": { color: "primary.dark" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: selected ? "inherit" : "text.secondary" }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography component="span" sx={{ fontSize: 14, fontWeight: 750 }}>
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ mt: "auto", p: 2 }}>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "#ffffff", p: 1.5 }}>
            <Stack spacing={1}>
              <Chip size="small" color="success" variant="outlined" label="Human approval required" sx={{ alignSelf: "flex-start" }} />
              <Typography variant="caption" color="text.secondary">
                Discovery and tailoring are automated. Submissions stay manual.
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ pl: { lg: `${drawerWidth}px` } }}>
        <Box
          sx={{
            display: { xs: "block", lg: "none" },
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 2,
            py: 2,
          }}
        >
          <Typography variant="h3">Job Search OS</Typography>
        </Box>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
