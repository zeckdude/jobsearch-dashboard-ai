import { afterEach, describe, expect, it, vi } from "vitest";
import { extractListedAt } from "@/lib/job-search/listed-at";

describe("extractListedAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("reads eightfold epoch timestamps", () => {
    const date = extractListedAt({ createdAtEpoch: 1_700_000_000 });
    expect(date?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("reads json-ld datePosted values", () => {
    const date = extractListedAt({
      item: { datePosted: "2026-03-01T12:00:00.000Z" },
    });
    expect(date?.toISOString()).toBe("2026-03-01T12:00:00.000Z");
  });

  it("reads brave relative ages", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:00:00.000Z"));
    const date = extractListedAt({ result: { age: "2 days ago" } });
    expect(date?.toISOString()).toBe("2026-06-09T12:00:00.000Z");
  });

  it("falls back when no source date exists", () => {
    const fallback = new Date("2026-01-15T00:00:00.000Z");
    expect(extractListedAt({}, fallback)).toEqual(fallback);
    expect(extractListedAt({}, null)).toBeNull();
  });
});
