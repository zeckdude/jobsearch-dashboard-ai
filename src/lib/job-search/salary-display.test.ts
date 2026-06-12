import { describe, expect, it } from "vitest";
import { formatJobSalaryRange } from "@/lib/job-search/salary-display";

describe("formatJobSalaryRange", () => {
  it("returns Not listed when salary is missing", () => {
    expect(formatJobSalaryRange(null, null, "USD")).toBe("Not listed");
  });

  it("formats a range", () => {
    expect(formatJobSalaryRange(160_000, 190_000, "USD")).toBe("USD 160,000 – USD 190,000");
  });

  it("formats a single minimum", () => {
    expect(formatJobSalaryRange(175_000, null, "USD")).toBe("USD 175,000+");
  });
});
