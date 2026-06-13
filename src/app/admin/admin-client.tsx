"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/ui/page-header";
import { clearAdminNavVisible } from "@/components/use-admin-nav-visible";

export function AdminHubClient() {
  const router = useRouter();

  async function revoke() {
    await fetch("/api/admin/revoke", { method: "POST" });
    clearAdminNavVisible();
    router.push("/settings");
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Admin hub"
        description="Internal tools for maintaining the product experience."
        actions={<Button variant="outlined" color="inherit" onClick={() => void revoke()}>Revoke admin access</Button>}
      />

      <Alert severity="info">Convenience gating only — not production authentication.</Alert>

      <Card>
        <CardActionArea component={Link} href="/design-system">
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <PaletteOutlinedIcon color="primary" />
              <BoxCopy />
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </>
  );
}

function BoxCopy() {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h3">Design system showcase</Typography>
      <Typography variant="body2" color="text.secondary">
        Interactive playground for tokens, components, alerts, forms, and resume-specific UI patterns.
      </Typography>
    </Stack>
  );
}
