import { describe, expect, it } from "vitest";
import {
  applyPostedDateFilter,
  passesPostedDateFilter,
  postedDateFilterSummary,
} from "@/lib/job-search/posted-date-filter";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";

const now = new Date("2026-06-11T12:00:00.000Z");

function job(input: { title?: string; rawData?: unknown } = {}): RawJobPosting {
  return {
    company: "Acme",
    title: input.title ?? "Senior Frontend Engineer",
    description: "React",
    applicationUrl: "https://example.com/jobs/1",
    rawData: input.rawData,
  };
}

describe("applyPostedDateFilter", () => {
  it("drops known postings older than max age", () => {
    const stale = job({ rawData: { datePosted: "2026-05-01T00:00:00.000Z" } });
    const recent = job({ rawData: { datePosted: "2026-06-09T00:00:00.000Z" } });
    const result = applyPostedDateFilter([stale, recent], {
      maxPostedAgeDays: 14,
      includeUnknownPostedDates: true,
    }, now);
    expect(result.kept).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("keeps unknown posting dates when includeUnknownPostedDates is true", () => {
    const unknown = job();
    expect(passesPostedDateFilter(unknown, {
      maxPostedAgeDays: 14,
      includeUnknownPostedDates: true,
    }, now)).toBe(true);
  });

  it("drops unknown posting dates when includeUnknownPostedDates is false", () => {
    const unknown = job();
    const result = applyPostedDateFilter([unknown], {
      maxPostedAgeDays: 14,
      includeUnknownPostedDates: false,
    }, now);
    expect(result.kept).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("ignores maxPostedAgeDays when a custom range is set", () => {
    const oldButInRange = job({ rawData: { datePosted: "2026-06-05T00:00:00.000Z" } });
    expect(passesPostedDateFilter(oldButInRange, {
      maxPostedAgeDays: 7,
      postedAfter: new Date("2026-06-01T00:00:00.000Z"),
      postedBefore: new Date("2026-06-26T00:00:00.000Z"),
      includeUnknownPostedDates: true,
    }, now)).toBe(true);
  });

  it("honors custom postedAfter and postedBefore window", () => {
    const inside = job({ rawData: { datePosted: "2026-06-05T00:00:00.000Z" } });
    const outside = job({ rawData: { datePosted: "2026-05-01T00:00:00.000Z" } });
    const result = applyPostedDateFilter([inside, outside], {
      maxPostedAgeDays: null,
      postedAfter: new Date("2026-06-01T00:00:00.000Z"),
      postedBefore: new Date("2026-06-10T00:00:00.000Z"),
      includeUnknownPostedDates: true,
    }, now);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]).toEqual(inside);
  });
});

describe("postedDateFilterSummary", () => {
  it("describes a custom range instead of day presets", () => {
    const summary = postedDateFilterSummary({
      maxPostedAgeDays: 7,
      postedAfter: new Date("2026-06-01T00:00:00.000Z"),
      postedBefore: new Date("2026-06-26T00:00:00.000Z"),
      includeUnknownPostedDates: true,
    });
    expect(summary).toContain("Jun");
    expect(summary).not.toContain("7-day");
  });

  it("describes quick presets without unknown-date noise", () => {
    expect(postedDateFilterSummary({
      maxPostedAgeDays: 14,
      includeUnknownPostedDates: true,
    })).toBe("Last 14 days");
  });
});
