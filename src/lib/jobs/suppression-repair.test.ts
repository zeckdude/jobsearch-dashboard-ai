import { JobMatchStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildSuppressionRepairDecisions, type SuppressionRepairActiveMatch, type SuppressionRepairSource } from "@/lib/jobs/suppression-repair";

describe("suppression repair decisions", () => {
  it("syncs an active duplicate to an applied source application status", () => {
    const decisions = buildSuppressionRepairDecisions({
      sources: [
        source({
          id: "app_1",
          type: "application",
          kind: "submitted",
          status: JobMatchStatus.applied,
          company: "Acme",
          title: "Senior Frontend Engineer",
          applicationUrl: "https://boards.greenhouse.io/acme/jobs/123/apply",
        }),
      ],
      activeMatches: [
        activeMatch({
          id: "match_1",
          company: "Acme Inc.",
          title: "Sr Front End Engineer",
          applicationUrl: "https://boards.greenhouse.io/acme/jobs/123",
        }),
      ],
    });

    expect(decisions).toMatchObject([
      {
        matchId: "match_1",
        reason: "submitted",
        fromStatus: JobMatchStatus.needs_review,
        toStatus: JobMatchStatus.applied,
      },
    ]);
  });

  it("rejects active duplicates of rejected source matches", () => {
    const decisions = buildSuppressionRepairDecisions({
      sources: [source({ id: "rejected_match", kind: "rejected", status: JobMatchStatus.rejected })],
      activeMatches: [activeMatch({ id: "match_1" })],
    });

    expect(decisions[0]).toMatchObject({
      sourceId: "rejected_match",
      reason: "rejected",
      toStatus: JobMatchStatus.rejected,
    });
  });

  it("archives active duplicates of archived source matches", () => {
    const decisions = buildSuppressionRepairDecisions({
      sources: [source({ id: "archived_match", kind: "archived", status: JobMatchStatus.archived })],
      activeMatches: [activeMatch({ id: "match_1" })],
    });

    expect(decisions[0]).toMatchObject({
      reason: "archived",
      toStatus: JobMatchStatus.archived,
    });
  });

  it("archives sibling ready-to-apply duplicates without changing the canonical ready match", () => {
    const decisions = buildSuppressionRepairDecisions({
      sources: [
        source({
          id: "ready_match",
          type: "match",
          kind: "ready_to_apply",
          status: JobMatchStatus.ready_to_apply,
          jobProfileMatchId: "ready_match",
        }),
      ],
      activeMatches: [
        activeMatch({ id: "ready_match", status: JobMatchStatus.ready_to_apply }),
        activeMatch({ id: "sibling_match", status: JobMatchStatus.approved }),
      ],
    });

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      matchId: "sibling_match",
      reason: "ready_to_apply_duplicate",
      toStatus: JobMatchStatus.archived,
    });
  });

  it("matches duplicate groups even when title variants differ", () => {
    const decisions = buildSuppressionRepairDecisions({
      sources: [
        source({
          id: "app_1",
          kind: "submitted",
          status: JobMatchStatus.screening,
          title: "Frontend Platform Engineer",
          duplicateGroupId: "dup_123",
        }),
      ],
      activeMatches: [
        activeMatch({
          id: "match_1",
          title: "Software Engineer, Web UI",
          duplicateGroupId: "dup_123",
        }),
      ],
    });

    expect(decisions[0]).toMatchObject({
      reason: "submitted",
      toStatus: JobMatchStatus.screening,
    });
  });

  it("prefers submitted history over rejected and archived signals", () => {
    const decisions = buildSuppressionRepairDecisions({
      sources: [
        source({ id: "archived_source", kind: "archived", status: JobMatchStatus.archived }),
        source({ id: "rejected_source", kind: "rejected", status: JobMatchStatus.rejected }),
        source({ id: "submitted_source", kind: "submitted", status: JobMatchStatus.follow_up_due }),
      ],
      activeMatches: [activeMatch({ id: "match_1" })],
    });

    expect(decisions[0]).toMatchObject({
      sourceId: "submitted_source",
      reason: "submitted",
      toStatus: JobMatchStatus.follow_up_due,
    });
  });
});

function source(input: Partial<SuppressionRepairSource> & {
  id: string;
  kind: SuppressionRepairSource["kind"];
  status: JobMatchStatus;
  company?: string;
  title?: string;
  location?: string | null;
  applicationUrl?: string | null;
  duplicateGroupId?: string | null;
}): SuppressionRepairSource {
  return {
    type: "match",
    userId: "user_1",
    job: job(input),
    ...input,
  };
}

function activeMatch(input: Partial<SuppressionRepairActiveMatch> & {
  id: string;
  company?: string;
  title?: string;
  location?: string | null;
  applicationUrl?: string | null;
  duplicateGroupId?: string | null;
}): SuppressionRepairActiveMatch {
  return {
    userId: "user_1",
    status: JobMatchStatus.needs_review,
    jobPostingId: `job_${input.id}`,
    job: job(input),
    ...input,
  };
}

function job(input: {
  id?: string;
  company?: string;
  title?: string;
  location?: string | null;
  applicationUrl?: string | null;
  duplicateGroupId?: string | null;
}) {
  return {
    id: input.id ? `job_${input.id}` : undefined,
    company: input.company ?? "Linear",
    title: input.title ?? "Senior / Staff Fullstack Engineer",
    location: input.location ?? "Remote",
    applicationUrl: input.applicationUrl ?? null,
    duplicateGroupId: input.duplicateGroupId ?? null,
  };
}
