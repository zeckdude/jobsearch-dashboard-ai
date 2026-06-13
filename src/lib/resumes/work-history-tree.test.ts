import { describe, expect, it } from "vitest";
import {
  achievementsToBulletTree,
  createBulletNode,
  createRoleNode,
  demoteRoleToBullet,
  promoteBulletToRole,
  treeToAchievements,
} from "@/lib/resumes/work-history-tree";

describe("work-history-tree", () => {
  it("round-trips nested achievements", () => {
    const role = createRoleNode({
      company: "Army",
      title: "Sergeant",
    });
    role.children = achievementsToBulletTree([
      "Led patrols.",
      "  Coordinated convoy security.",
      "Deployed in Operation Iraqi Freedom, March 2003 - July 2004.",
    ]);

    expect(treeToAchievements(role)).toEqual([
      "Led patrols.",
      "  Coordinated convoy security.",
      "Deployed in Operation Iraqi Freedom, March 2003 - July 2004.",
    ]);
  });

  it("promotes a bullet to a sibling role with prefilled fields", () => {
    const tree = [
      {
        ...createRoleNode({ company: "Army", title: "Sergeant" }),
        children: [
          createBulletNode("Led patrols."),
          createBulletNode("Deployed in Operation Iraqi Freedom, March 2003 - July 2004."),
        ],
      },
    ];

    const promoted = promoteBulletToRole(tree, [0, 1]);
    expect(promoted).toHaveLength(2);
    expect(promoted[1]?.company).toContain("Deployed in Operation Iraqi Freedom");
    expect(promoted[1]?.startDate).toBe("March 2003");
    expect(promoted[0]?.children).toHaveLength(1);
  });

  it("demotes a role into a bullet under the previous role", () => {
    const tree = [
      {
        ...createRoleNode({ company: "Army", title: "Sergeant" }),
        children: [createBulletNode("Led patrols.")],
      },
      {
        ...createRoleNode({
          company: "Deployed in Operation Iraqi Freedom",
          title: "March",
          startDate: "2003",
          endDate: "July 2004",
        }),
        children: [],
      },
    ];

    const demoted = demoteRoleToBullet(tree, 1);
    expect(demoted).toHaveLength(1);
    expect(demoted[0]?.children.some((bullet) => /Operation Iraqi Freedom/i.test(bullet.text))).toBe(true);
  });
});
