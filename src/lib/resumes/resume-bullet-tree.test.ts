import { describe, expect, it } from "vitest";
import {
  achievementsToTree,
  addBullet,
  createBulletNode,
  indentBullet,
  moveBulletDown,
  moveBulletUp,
  outdentBullet,
  removeBullet,
  treeToAchievements,
} from "@/lib/resumes/resume-bullet-tree";

describe("resume-bullet-tree", () => {
  it("round-trips parent and child achievements", () => {
    const tree = achievementsToTree([
      "Led platform migration.",
      "  Improved test coverage.",
      "Shipped billing dashboard.",
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0]?.children).toHaveLength(1);
    expect(treeToAchievements(tree)).toEqual([
      "Led platform migration.",
      "  Improved test coverage.",
      "Shipped billing dashboard.",
    ]);
  });

  it("moves, indents, and removes bullets", () => {
    const initial = [
      createBulletNode("First"),
      createBulletNode("Second"),
      createBulletNode("Third"),
    ];

    const movedUp = moveBulletUp(initial, [2]);
    expect(movedUp.map((node) => node.text)).toEqual(["First", "Third", "Second"]);

    const indented = indentBullet(initial, [1]);
    expect(indented[0]?.children[0]?.text).toBe("Second");
    expect(indented).toHaveLength(2);

    const outdented = outdentBullet(indented, [0, 0]);
    expect(outdented.map((node) => node.text)).toEqual(["First", "Second", "Third"]);

    const withAdded = addBullet(initial, [0]);
    expect(withAdded).toHaveLength(4);
    expect(withAdded[1]?.text).toBe("");

    const removed = removeBullet(initial, [1]);
    expect(removed.map((node) => node.text)).toEqual(["First", "Third"]);

    const movedDown = moveBulletDown(initial, [0]);
    expect(movedDown.map((node) => node.text)).toEqual(["Second", "First", "Third"]);
  });
});
