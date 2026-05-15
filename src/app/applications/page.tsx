import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Link from "next/link";
import { AppShell } from "@/app/app-shell";
import { ActionButton } from "@/components/action-button";
import { BulkPrepareControl } from "@/components/bulk-prepare-control";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip, formatStatus } from "@/components/ui/status-chip";
import { prisma } from "@/lib/prisma";
import { ApplicationCreateForm } from "./application-create-form";
import { ApplicationDeleteButton } from "./application-delete-button";
import { BackfillPacketsButton } from "./backfill-packets-button";
import { MarkAppliedButton } from "./mark-applied-button";

export const dynamic = "force-dynamic";

const columns = ["approved", "ready_to_apply", "applied", "follow_up_due", "screening", "interviewing", "offer", "archived"];

export default async function ApplicationsPage() {
  const [applications, matches] = await Promise.all([
    prisma.application.findMany({
      include: { jobPosting: true, resume: true, coverLetter: true, applicationPackets: { take: 1 } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.jobProfileMatch.findMany({
      where: { status: { in: ["approved", "ready_to_apply", "resume_generated", "cover_letter_generated"] } },
      include: { jobPosting: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  const nextAction = applicationsNextAction({
    approvedCount: applications.filter((application) => application.status === "approved").length,
    readyCount: applications.filter((application) => application.status === "ready_to_apply").length,
    availableMatchCount: matches.length,
  });

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Application control"
          title="Applications"
          description="Track approved roles from packet generation through assistant fill, follow-up reminders, interview prep, outcomes, and company-specific automation policy."
          actions={<ApplicationCreateForm jobs={matches.map((match) => ({
            id: match.jobPostingId,
            matchId: match.id,
            label: `${match.jobPosting.company} · ${match.jobPosting.title}`,
          }))} />}
        />
        <Card sx={{ borderColor: nextAction.color === "success" ? "success.main" : "primary.main", bgcolor: nextAction.color === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(37, 99, 235, 0.08)" }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
              <Box>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
                  <Chip size="small" color={nextAction.color} label="Next action" />
                  {typeof nextAction.count === "number" ? <Chip size="small" variant="outlined" label={nextAction.count} /> : null}
                </Stack>
                <Typography variant="h3">{nextAction.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{nextAction.detail}</Typography>
              </Box>
              <ActionButton
                href={nextAction.href}
                postTo={nextAction.postTo}
                variant="contained"
                color={nextAction.color}
                startIcon={nextAction.icon}
              >
                {nextAction.label}
              </ActionButton>
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h3">Apply Sprint</Typography>
              <Typography variant="body2" color="text.secondary">
                Batch-generate materials, then launch the next highest-scoring ready application. The assistant fills and uploads; you review and submit.
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ alignItems: { md: "center" } }}>
                <BulkPrepareControl compact defaultMinimumScore={85} defaultLimit={10} />
                <BackfillPacketsButton />
                <ActionButton href="/applications/assistant" variant="outlined" startIcon={<BoltOutlinedIcon />}>
                  Open sprint console
                </ActionButton>
                <ActionButton
                  postTo="/api/applications/next-ready/launch-assistant"
                  variant="contained"
                  color="success"
                  startIcon={<PlayCircleOutlineOutlinedIcon />}
                >
                  Launch next ready
                </ActionButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2 }}>
          {columns.map((status) => {
            const items = applications.filter((application) => application.status === status);
            return (
              <Card key={status} sx={{ minHeight: 220 }}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <StatusChip status={status} />
                    <Chip label={items.length} sx={{ fontVariantNumeric: "tabular-nums" }} />
                  </Stack>
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {items.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No {formatStatus(status)} applications.</Typography>
                    ) : (
                      items.map((application) => (
                        <Box key={application.id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                          <Typography sx={{ fontWeight: 800 }}>{application.jobPosting.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{application.jobPosting.company}</Typography>
                          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
                            {application.resume ? <Chip size="small" color="success" variant="outlined" label="Resume" /> : null}
                            {application.coverLetter ? <Chip size="small" color="secondary" variant="outlined" label="Cover letter" /> : null}
                            {application.applicationPackets.length ? <Chip size="small" color="primary" variant="outlined" label="Packet" /> : null}
                          </Stack>
                          <Box sx={{ mt: 1 }}>
                            <ActionButton href={`/applications/${application.id}`} size="small" variant="outlined" startIcon={<FactCheckOutlinedIcon />}>
                              Review packet
                            </ActionButton>
                          </Box>
                          {application.jobPosting.applicationUrl ? (
                            <Button
                              component={Link}
                              href={application.jobPosting.applicationUrl}
                              target="_blank"
                              rel="noreferrer"
                              size="small"
                              variant="outlined"
                              sx={{ mt: 1 }}
                            >
                              Open application
                            </Button>
                          ) : null}
                          {application.status === "approved" || application.status === "ready_to_apply" ? (
                            <Box sx={{ mt: 1 }}>
                              <ApplicationDeleteButton
                                applicationId={application.id}
                                label={`${application.jobPosting.company} - ${application.jobPosting.title}`}
                              />
                            </Box>
                          ) : null}
                          {application.status === "ready_to_apply" && application.resume && application.coverLetter ? (
                            <>
                              <Divider sx={{ my: 1.25 }} />
                              <Stack spacing={0.75}>
                                <ActionButton
                                  postTo={`/api/applications/${application.id}/launch-assistant`}
                                  message="Local assistant launched. Review the browser window and submit manually."
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<PlayCircleOutlineOutlinedIcon />}
                                >
                                  Launch assistant
                                </ActionButton>
                                <MarkAppliedButton applicationId={application.id} />
                                <Typography variant="caption" color="text.secondary">
                                  Launch the assistant, review the employer form, then mark this item applied after submission.
                                </Typography>
                              </Stack>
                            </>
                          ) : null}
                        </Box>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
        {applications.length === 0 ? (
          <Card>
            <EmptyState title="No applications tracked" body="Create an application from an approved match when you are ready to work it." />
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  );
}

function applicationsNextAction({ approvedCount, readyCount, availableMatchCount }: { approvedCount: number; readyCount: number; availableMatchCount: number }) {
  if (readyCount > 0) {
    return {
      title: "Work Apply Sprint",
      detail: "Ready applications have resume and cover letter materials. Open the sprint console to launch the assistant and track submission.",
      label: "Open sprint console",
      href: "/applications/assistant",
      color: "success" as const,
      icon: <BoltOutlinedIcon />,
      count: readyCount,
    };
  }
  if (approvedCount > 0) {
    return {
      title: "Prepare application packets",
      detail: "Approved applications need tailored materials before they can move into Apply Sprint.",
      label: "Prepare packets",
      postTo: "/api/applications/packets/backfill",
      color: "primary" as const,
      icon: <FactCheckOutlinedIcon />,
      count: approvedCount,
    };
  }
  if (availableMatchCount > 0) {
    return {
      title: "Create an application tracker",
      detail: "Approved matches are available. Create an application item before generating materials.",
      label: "Create application",
      href: "/jobs?status=approved",
      color: "primary" as const,
      icon: <FactCheckOutlinedIcon />,
      count: availableMatchCount,
    };
  }
  return {
    title: "Review jobs first",
    detail: "No application work is ready. Approve strong job matches, then return here to generate packets.",
    label: "Review jobs",
    href: "/jobs",
    color: "primary" as const,
    icon: <FactCheckOutlinedIcon />,
  };
}
