/**
 * Wipes all job search and application data, then re-seeds default configuration.
 *
 * KEPT:  user account, notification settings, automation settings, company policies,
 *        user profile, work experience, evidence library, GitHub repos, resume uploads,
 *        search profiles (re-seeded to defaults), resume profiles (re-seeded to defaults),
 *        job sources (re-seeded to defaults), skill adjustments, skill feedback,
 *        field memories, answer memories, form patterns, OAuth connections,
 *        career mission, contacts.
 *
 * WIPED: job postings, job matches, applications, application packets, generated resumes,
 *        generated cover letters, automation runs, agent user requests, outcomes,
 *        interview prep, events, outreach, thank-you drafts, job suppressions,
 *        agent runs, job search runs, Jolene conversations, notification logs,
 *        outcome calibration snapshots, career sprint snapshots, agent quality data,
 *        improvement proposals, email message records, search profile performance.
 *
 * Usage:
 *   npx tsx scripts/reset-job-data.ts            # dry run (shows counts, no changes)
 *   npx tsx scripts/reset-job-data.ts --confirm  # actually wipes data and re-seeds
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();
const isDryRun = !process.argv.includes("--confirm");

function log(msg: string) {
  console.log(msg);
}

function section(title: string) {
  console.log(`\n── ${title}`);
}

async function countAll() {
  const [
    jobPostings,
    jobSuppressions,
    agentRuns,
    jobSearchRuns,
    searchProfilePerformance,
    notificationLogs,
    joleneConversations,
    outcomeCalibrationSnapshots,
    careerSprintSnapshots,
    agentQualityDatasets,
    agentQualityExamples,
    agentQualityEvaluations,
    agentImprovementProposals,
    emailMessageRecords,
    agentUserRequests,
  ] = await Promise.all([
    prisma.jobPosting.count(),
    prisma.jobSuppression.count(),
    prisma.agentRun.count(),
    prisma.jobSearchRun.count(),
    prisma.searchProfilePerformance.count(),
    prisma.notificationLog.count(),
    prisma.joleneConversation.count(),
    prisma.outcomeCalibrationSnapshot.count(),
    prisma.careerSprintSnapshot.count(),
    prisma.agentQualityDataset.count(),
    prisma.agentQualityExample.count(),
    prisma.agentQualityEvaluation.count(),
    prisma.agentImprovementProposal.count(),
    prisma.emailMessageRecord.count(),
    prisma.agentUserRequest.count(),
  ]);

  return {
    jobPostings,
    jobSuppressions,
    agentRuns,
    jobSearchRuns,
    searchProfilePerformance,
    notificationLogs,
    joleneConversations,
    outcomeCalibrationSnapshots,
    careerSprintSnapshots,
    agentQualityDatasets,
    agentQualityExamples,
    agentQualityEvaluations,
    agentImprovementProposals,
    emailMessageRecords,
    agentUserRequests,
  };
}

async function main() {
  if (isDryRun) {
    log("DRY RUN — pass --confirm to actually wipe data.\n");
  } else {
    log("LIVE RUN — wiping job data and re-seeding defaults.\n");
  }

  const counts = await countAll();

  section("Records that will be deleted");
  log(`  ${counts.jobPostings} job postings (cascades applications, matches, generated resumes/cover letters, packets, automation runs, outcomes, events, prep tasks, outreach, thank-you drafts)`);
  log(`  ${counts.jobSuppressions} job suppressions`);
  log(`  ${counts.agentUserRequests} agent user requests (Needs Me items)`);
  log(`  ${counts.agentRuns} agent runs`);
  log(`  ${counts.jobSearchRuns} job search runs`);
  log(`  ${counts.searchProfilePerformance} search profile performance snapshots`);
  log(`  ${counts.notificationLogs} notification logs`);
  log(`  ${counts.joleneConversations} Jolene conversations`);
  log(`  ${counts.outcomeCalibrationSnapshots} outcome calibration snapshots`);
  log(`  ${counts.careerSprintSnapshots} career sprint snapshots`);
  log(`  ${counts.agentQualityDatasets} agent quality datasets`);
  log(`  ${counts.agentQualityExamples} agent quality examples`);
  log(`  ${counts.agentQualityEvaluations} agent quality evaluations`);
  log(`  ${counts.agentImprovementProposals} agent improvement proposals`);
  log(`  ${counts.emailMessageRecords} email message records`);

  section("Records that will be kept");
  log("  User account, profile, work experience, evidence, GitHub repos, resume uploads");
  log("  Search profiles, resume profiles, job sources (re-seeded to defaults)");
  log("  Notification settings, automation settings, company policies");
  log("  Skill adjustments, skill feedback, field memories, answer memories, form patterns");
  log("  OAuth connections, career mission, contacts");

  if (isDryRun) {
    log("\nRun with --confirm to proceed.");
    return;
  }

  log("\nStarting deletion...");

  // Null out Application.resumeId and coverLetterId before deletion to avoid FK
  // constraint issues when both Application and GeneratedResume cascade from JobPosting.
  await prisma.application.updateMany({ data: { resumeId: null, coverLetterId: null } });

  // Delete job suppressions first (SetNull FKs from JobPosting/Application, not cascaded).
  const suppressions = await prisma.jobSuppression.deleteMany({});
  log(`  Deleted ${suppressions.count} job suppressions`);

  // Delete all job postings — cascades: Application (→ ApplicationPacket,
  // ApplicationAutomationRun, AgentUserRequest, ApplicationEvent, InterviewPrepTask,
  // ApplicationOutcome, ThankYouDraft), GeneratedResume, GeneratedCoverLetter,
  // JobProfileMatch, JobEvaluation, RecruiterOutreach.
  const postings = await prisma.jobPosting.deleteMany({});
  log(`  Deleted ${postings.count} job postings (and all cascaded records)`);

  // Delete any remaining AgentUserRequests not tied to a job/application.
  const requests = await prisma.agentUserRequest.deleteMany({});
  log(`  Deleted ${requests.count} remaining agent user requests`);

  // Delete agent runs (cascades AgentRunEvent).
  const agentRuns = await prisma.agentRun.deleteMany({});
  log(`  Deleted ${agentRuns.count} agent runs`);

  // Delete job search run history.
  const searchRuns = await prisma.jobSearchRun.deleteMany({});
  log(`  Deleted ${searchRuns.count} job search runs`);

  // Delete search profile performance snapshots.
  const perfSnapshots = await prisma.searchProfilePerformance.deleteMany({});
  log(`  Deleted ${perfSnapshots.count} search profile performance snapshots`);

  // Delete notification logs.
  const notifLogs = await prisma.notificationLog.deleteMany({});
  log(`  Deleted ${notifLogs.count} notification logs`);

  // Delete Jolene conversations (cascades JoleneMessage).
  const conversations = await prisma.joleneConversation.deleteMany({});
  log(`  Deleted ${conversations.count} Jolene conversations`);

  // Delete outcome calibration snapshots.
  const outcomeSnapshots = await prisma.outcomeCalibrationSnapshot.deleteMany({});
  log(`  Deleted ${outcomeSnapshots.count} outcome calibration snapshots`);

  // Delete career sprint snapshots.
  const sprintSnapshots = await prisma.careerSprintSnapshot.deleteMany({});
  log(`  Deleted ${sprintSnapshots.count} career sprint snapshots`);

  // Delete agent quality data (cascade: examples and evaluations from dataset).
  const qualityDatasets = await prisma.agentQualityDataset.deleteMany({});
  log(`  Deleted ${qualityDatasets.count} agent quality datasets`);

  const qualityExamples = await prisma.agentQualityExample.deleteMany({});
  log(`  Deleted ${qualityExamples.count} remaining agent quality examples`);

  const qualityEvals = await prisma.agentQualityEvaluation.deleteMany({});
  log(`  Deleted ${qualityEvals.count} remaining agent quality evaluations`);

  const proposals = await prisma.agentImprovementProposal.deleteMany({});
  log(`  Deleted ${proposals.count} agent improvement proposals`);

  // Delete email message records (SetNull'd from Application/JobPosting, still exist).
  const emailRecords = await prisma.emailMessageRecord.deleteMany({});
  log(`  Deleted ${emailRecords.count} email message records`);

  log("\nRe-seeding default configuration (search profiles, job sources, resume profiles)...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

  log("\n✓ Reset complete. Your profile, settings, and learned data are intact.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
