import Stack from "@mui/material/Stack";
import { AppShell } from "@/app/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await prisma.user.findFirst({
    include: { notificationSettings: true, profile: { include: { githubRepositories: true } } },
    orderBy: { createdAt: "asc" },
  });
  const settings = user?.notificationSettings;

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 980 }}>
        <PageHeader
          eyebrow="Preferences"
          title="Settings"
          description="Configure notification defaults and profile data used by approved application workflows."
        />
        <SettingsClient
          initialSettings={{
            emailEnabled: settings?.emailEnabled ?? true,
            emailAddress: settings?.emailAddress ?? user?.email ?? "",
            pushoverEnabled: settings?.pushoverEnabled ?? false,
            pushoverUserKey: settings?.pushoverUserKey ?? "",
            pushoverAppToken: settings?.pushoverAppToken ?? "",
            minimumScoreForPush: settings?.minimumScoreForPush ?? 85,
            digestMode: settings?.digestMode ?? "strong_matches_only",
          }}
          aiSettings={{
            configured: Boolean(process.env.OPENAI_API_KEY),
            model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          }}
          profileSettings={{
            linkedinUrl: user?.profile?.linkedinUrl ?? "",
            githubUrl: user?.profile?.githubUrl ?? "https://github.com/carlwelchdesign",
            raceAnswer: user?.profile?.raceAnswer ?? "",
            genderAnswer: user?.profile?.genderAnswer ?? "",
            veteranStatusAnswer: user?.profile?.veteranStatusAnswer ?? "",
            disabilityAnswer: user?.profile?.disabilityAnswer ?? "",
            githubRepositoryCount: user?.profile?.githubRepositories.length ?? 0,
            latestGithubSync: user?.profile?.githubRepositories
              .map((repo) => repo.updatedAt)
              .sort((a, b) => b.getTime() - a.getTime())[0]?.toLocaleString() ?? null,
          }}
        />
      </Stack>
    </AppShell>
  );
}
