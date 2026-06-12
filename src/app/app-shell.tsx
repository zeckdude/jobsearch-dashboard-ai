"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { DesktopAppNavigation, MobileAppNavigation } from "@/components/app-navigation";

const drawerWidth = 264;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "linear-gradient(180deg, rgba(104, 85, 52, 0.08) 0px, rgba(104, 85, 52, 0) 260px), linear-gradient(90deg, rgba(15, 118, 110, 0.06) 0px, rgba(15, 118, 110, 0) 360px)",
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
            bgcolor: "#fffdf8",
            backgroundImage: "linear-gradient(180deg, #fffdf8 0%, #f4f0e7 100%)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        <Toolbar sx={{ minHeight: 96, px: 3, flexShrink: 0 }}>
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
              <Typography variant="h3" sx={{ lineHeight: 1.1 }}>Apply System</Typography>
            </Stack>
          </Stack>
        </Toolbar>
        <Divider />
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <DesktopAppNavigation />
        </Box>
      </Drawer>

      <Box component="main" sx={{ pl: { lg: `${drawerWidth}px` } }}>
        <Box
          sx={{
            display: { xs: "block", lg: "none" },
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: 1100,
            boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                <Avatar variant="rounded" sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText" }}>
                  <AutoAwesomeOutlinedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h3" sx={{ lineHeight: 1.1 }}>Job Search OS</Typography>
                  <Typography variant="caption" color="text.secondary">Apply System</Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
          <MobileAppNavigation />
        </Box>
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, sm: 3 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
