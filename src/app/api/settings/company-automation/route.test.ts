import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertCompanyAutomationPolicy } from "@/lib/applications/auto-submit-policy";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

vi.mock("@/lib/applications/auto-submit-policy", () => ({
  upsertCompanyAutomationPolicy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    companyAutomationPolicy: {
      findMany: vi.fn(),
    },
  },
}));

const findUserMock = vi.mocked(prisma.user.findFirst);
const findPoliciesMock = vi.mocked(prisma.companyAutomationPolicy.findMany);
const upsertPolicyMock = vi.mocked(upsertCompanyAutomationPolicy);

describe("/api/settings/company-automation", () => {
  beforeEach(() => {
    findUserMock.mockReset();
    findPoliciesMock.mockReset();
    upsertPolicyMock.mockReset();
  });

  it("lists company automation policies", async () => {
    findUserMock.mockResolvedValue({ id: "user_1" } as Awaited<ReturnType<typeof prisma.user.findFirst>>);
    findPoliciesMock.mockResolvedValue([
      { id: "policy_1", company: "Acme", autoSubmitMode: "BLOCK" },
    ] as Awaited<ReturnType<typeof prisma.companyAutomationPolicy.findMany>>);

    const response = await GET();

    expect(findPoliciesMock).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user_1" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ policies: [{ id: "policy_1" }] });
  });

  it("upserts a company automation policy", async () => {
    findUserMock.mockResolvedValue({ id: "user_1" } as Awaited<ReturnType<typeof prisma.user.findFirst>>);
    upsertPolicyMock.mockResolvedValue({
      id: "policy_1",
      company: "Acme",
      autoSubmitMode: "BLOCK",
    } as Awaited<ReturnType<typeof upsertCompanyAutomationPolicy>>);

    const response = await POST(new Request("http://localhost/api/settings/company-automation", {
      method: "POST",
      body: JSON.stringify({ company: "Acme", autoSubmitMode: "BLOCK" }),
    }));

    expect(upsertPolicyMock).toHaveBeenCalledWith({
      userId: "user_1",
      company: "Acme",
      autoSubmitMode: "BLOCK",
      notes: undefined,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: "Auto-submit blocked for Acme.",
    });
  });
});
