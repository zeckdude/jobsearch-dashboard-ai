import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareApplicationPackage } from "@/lib/applications/prepare-package";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/applications/prepare-package", () => ({
  prepareApplicationPackage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobProfileMatch: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

const preparePackageMock = vi.mocked(prepareApplicationPackage);
const matchFindManyMock = vi.mocked(prisma.jobProfileMatch.findMany);

describe("POST /api/jobs/bulk/prepare-applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchFindManyMock.mockResolvedValue([] as never);
  });

  it("rejects needs_review matches so bulk prepare cannot bypass agency approval", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/bulk/prepare-applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statuses: ["needs_review"] }),
    }));

    expect(response.status).toBe(400);
    expect(preparePackageMock).not.toHaveBeenCalled();
    expect(matchFindManyMock).not.toHaveBeenCalled();
  });

  it("defaults to already-approved matches only", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/bulk/prepare-applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minimumScore: 90, limit: 5 }),
    }));

    expect(response.status).toBe(200);
    expect(matchFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { in: ["approved"] },
      }),
    }));
  });
});
