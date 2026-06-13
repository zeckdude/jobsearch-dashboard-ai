import { describe, expect, it } from "vitest";
import { selectResumeSourceBullets, summarizeResumeSourceBullets } from "./source-materials";

describe("resume source materials", () => {
  it("dedupes bullets by normalized text", () => {
    const selected = selectResumeSourceBullets([
      { text: "Led migration to React." },
      { text: "Led   migration to react." },
      { text: "Built CI pipelines." },
    ]);

    expect(selected).toHaveLength(2);
  });

  it("summarizes role-description digest bullets for generation notes", () => {
    const selected = [
      { id: "digest_1", text: "Built React workflows", metrics: { source: "role_description_digest" } },
      { id: "manual_1", text: "Led team delivery", metrics: {} },
      { id: "upload_1", text: "Shipped SaaS features", metrics: {} },
    ];

    expect(summarizeResumeSourceBullets(selected)).toMatchObject({
      totalBulletCount: 3,
      profileBulletCount: 3,
      latestUploadBulletCount: 0,
      roleDescriptionDigestBulletIds: ["digest_1"],
    });
  });
});
