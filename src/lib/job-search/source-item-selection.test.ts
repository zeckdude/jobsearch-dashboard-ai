import { describe, expect, it } from "vitest";
import {
  applySourceItemSelection,
  breakdownWithSelection,
  defaultIncludedItemKeys,
  effectiveSourceItemKeys,
  toggleSourceItemSelection,
} from "@/lib/job-search/source-item-selection";
import { sourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";

const greenhouseSource = {
  id: "src_greenhouse",
  type: "greenhouse" as const,
  name: "Greenhouse",
  baseUrl: null,
  config: {
    companySlugs: ["airbnb", "anthropic", "stripe"],
    maxCompanies: 2,
    maxFetch: 600,
  },
};

describe("source item selection", () => {
  it("defaults to breakdown included items when no per-run override exists", () => {
    const breakdown = sourceRunBreakdown(greenhouseSource)!;
    expect(defaultIncludedItemKeys(breakdown)).toEqual(["airbnb", "anthropic"]);
    expect(effectiveSourceItemKeys(greenhouseSource.id, breakdown, {})).toEqual(["airbnb", "anthropic"]);
  });

  it("uses per-run selections when provided", () => {
    const breakdown = sourceRunBreakdown(greenhouseSource)!;
    const selections = { [greenhouseSource.id]: ["stripe"] };
    expect(effectiveSourceItemKeys(greenhouseSource.id, breakdown, selections)).toEqual(["stripe"]);
  });

  it("materializes defaults when toggling off one item", () => {
    const breakdown = sourceRunBreakdown(greenhouseSource)!;
    const next = toggleSourceItemSelection(greenhouseSource.id, "anthropic", breakdown, {});
    expect(next[greenhouseSource.id]).toEqual(["airbnb"]);
  });

  it("filters greenhouse slugs for ingest when customized", () => {
    const customized = applySourceItemSelection(greenhouseSource, ["stripe"]);
    const config = customized.config as { companySlugs: string[]; maxCompanies: number };
    expect(config.companySlugs).toEqual(["stripe"]);
    expect(config.maxCompanies).toBe(1);
  });

  it("leaves source unchanged when no customization is stored", () => {
    expect(applySourceItemSelection(greenhouseSource, undefined)).toBe(greenhouseSource);
  });

  it("reflects customized counts in breakdownWithSelection", () => {
    const withSelection = breakdownWithSelection(greenhouseSource, {
      [greenhouseSource.id]: ["stripe"],
    });
    expect(withSelection?.includedThisRun).toBe(1);
    expect(withSelection?.items.find((item) => item.label === "stripe")?.includedThisRun).toBe(true);
    expect(withSelection?.items.find((item) => item.label === "airbnb")?.includedThisRun).toBe(false);
  });
});
