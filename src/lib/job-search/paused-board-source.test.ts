import { describe, expect, it } from "vitest";
import { prepareBoardSourceForRun } from "@/lib/job-search/paused-board-source";

describe("prepareBoardSourceForRun", () => {
  it("restores fetch limits when a paused board is included in a run", () => {
    const source = {
      id: "src_remoteok",
      name: "RemoteOK",
      type: "remoteok" as const,
      baseUrl: "https://remoteok.com",
      enabled: false,
      config: { maxFetch: 0, reason: "paywalled/apply friction" },
    };

    const prepared = prepareBoardSourceForRun(source, true);
    expect((prepared.config as { maxFetch: number }).maxFetch).toBe(240);
  });

  it("leaves configured sources unchanged", () => {
    const source = {
      id: "src_wwr",
      name: "We Work Remotely",
      type: "weworkremotely" as const,
      baseUrl: "https://weworkremotely.com",
      enabled: true,
      config: { maxFetch: 80 },
    };

    expect(prepareBoardSourceForRun(source, true)).toBe(source);
  });
});
