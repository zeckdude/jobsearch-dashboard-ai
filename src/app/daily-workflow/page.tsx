export const metadata = {
  title: "Daily Workflow History | Job Search OS",
  description: "Track your daily workflow completions, streaks, and habit stats.",
};

import { AppShell } from "@/app/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { WorkflowHistoryClient } from "./workflow-history-client";

export const dynamic = "force-dynamic";

export default function DailyWorkflowPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Habit tracker"
        title="Daily Workflow History"
        description="Track your daily workflow completions, streaks, and step breakdown."
      />
      <WorkflowHistoryClient />
    </AppShell>
  );
}
