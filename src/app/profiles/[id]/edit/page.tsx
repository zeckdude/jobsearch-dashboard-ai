export const metadata = {
  title: "Edit Search Profile | Job Search OS",
  description: "Edit search profile targeting, thresholds, and filters.",
};

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "../../profile-edit-form";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage({ params }: { params: { id: string } }) {
  const profile = await prisma.jobSearchProfile.findUnique({ where: { id: params.id } });
  if (!profile) notFound();

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Search profile"
          title={`Edit ${profile.name}`}
          description="Change what jobs this profile looks for and how many make it into your queue. Save when you're done — discovery uses these settings on the next search."
        />
        <Card>
          <CardContent>
            <ProfileEditForm
              profile={{
                id: profile.id,
                name: profile.name,
                remotePreference: profile.remotePreference,
                remotePreferences: jsonArray(profile.remotePreferences),
                salaryCurrency: profile.salaryCurrency,
                salaryMin: profile.salaryMin,
                minimumMatchScore: profile.minimumMatchScore,
                maxResultsPerRun: profile.maxResultsPerRun,
                titles: jsonArray(profile.titles),
                countries: jsonArray(profile.countries),
                cities: jsonArray(profile.cities),
                keywordsPreferred: jsonArray(profile.keywordsPreferred),
                keywordsExcluded: jsonArray(profile.keywordsExcluded),
                excludedCompanies: jsonArray(profile.excludedCompanies),
              }}
              cancelHref={`/profiles/${profile.id}`}
            />
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
