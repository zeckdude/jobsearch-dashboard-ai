import { describe, expect, it, vi } from "vitest";
import { agentRuntimeSource, getAdkAgentRegistration, listAdkAgentRegistrations, shouldUseAdkControlPlane, validateAdkAgentRegistry } from "@/lib/adk/registry";

describe("ADK agent registry", () => {
  it("registers only valid read-only pilot agents", () => {
    expect(validateAdkAgentRegistry()).toEqual([]);
    expect(listAdkAgentRegistrations().map((agent) => agent.agentType)).toEqual(expect.arrayContaining(["DAILY_COMMAND_CENTER", "MARKET_INTELLIGENCE"]));
    expect(getAdkAgentRegistration("RECRUITING_AGENCY")).toBeNull();
  });

  it("uses ADK only when the feature flag is enabled", () => {
    vi.stubEnv("ADK_ENABLED", "false");
    expect(shouldUseAdkControlPlane("DAILY_COMMAND_CENTER")).toBe(false);
    expect(agentRuntimeSource("DAILY_COMMAND_CENTER")).toBe("service");

    vi.stubEnv("ADK_ENABLED", "true");
    expect(shouldUseAdkControlPlane("DAILY_COMMAND_CENTER")).toBe(true);
    expect(agentRuntimeSource("DAILY_COMMAND_CENTER")).toBe("adk");
    expect(agentRuntimeSource("RECRUITING_AGENCY", "thread_1")).toBe("langgraph");

    vi.unstubAllEnvs();
  });
});
