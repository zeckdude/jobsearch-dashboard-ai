import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import { AppShell } from "@/app/app-shell";
import { verifyAdminGateToken, ADMIN_GATE_COOKIE } from "@/lib/admin/gate";
import { AdminHubClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const token = cookies().get(ADMIN_GATE_COOKIE)?.value;
  if (!verifyAdminGateToken(token)) redirect("/settings?admin=denied");

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 960, mx: "auto" }}>
        <AdminHubClient />
      </Stack>
    </AppShell>
  );
}
