import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const loadMasterResumePreviewMock = vi.fn();

vi.mock("@/lib/resumes/load-master-preview", () => ({
  loadMasterResumePreview: () => loadMasterResumePreviewMock(),
}));

describe("POST /api/resumes/master/pdf", () => {
  beforeEach(() => {
    loadMasterResumePreviewMock.mockReset();
  });

  it("returns a PDF when a profile exists", async () => {
    loadMasterResumePreviewMock.mockResolvedValue({
      preset: "metro",
      profileName: "Alex Rivera",
      request: {
        preset: "metro",
        profile: {
          fullName: "Alex Rivera",
          email: "alex@example.com",
          professionalSummary: "Senior engineer.",
        },
        bullets: [
          {
            company: "Acme",
            role: "Senior Engineer",
            text: "Led migration of customer dashboard to React.",
            truthLevel: "verified",
            category: "frontend",
          },
        ],
      },
    });

    const response = await POST();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-resume-preset")).toBe("metro");
    expect(Number(response.headers.get("x-ats-score"))).toBeGreaterThan(0);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it("returns 400 when no profile exists", async () => {
    loadMasterResumePreviewMock.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/profile/i);
  });
});
