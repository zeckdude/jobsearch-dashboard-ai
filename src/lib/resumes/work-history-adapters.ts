import { buildWorkHistoryGroups } from "@/lib/resumes/group-work-bullets";
import type { WorkHistoryTree } from "@/lib/resumes/work-history-tree";
import {
  achievementsToBulletTree,
  isTempNodeId,
  treeToAchievements,
  type WorkHistoryBulletNode,
  type WorkHistoryRoleNode,
} from "@/lib/resumes/work-history-tree";
import type { ParsedResume } from "@/lib/resumes/schemas";

export type DraftBullet = {
  id: string;
  company: string;
  role: string;
  category: string;
  text: string;
  keywords: string[];
  sourceText: string | null;
  truthLevel: string;
};

export function parsedWorkToTree(workExperience: ParsedResume["workExperience"]): WorkHistoryTree {
  return workExperience.map((work, index) => ({
    kind: "role" as const,
    id: `role-${work.company}-${work.title}-${index}`,
    company: work.company,
    title: work.title,
    startDate: work.startDate ?? null,
    endDate: work.endDate ?? null,
    children: achievementsToBulletTree(work.achievements),
  }));
}

export function treeToParsedWork(
  tree: WorkHistoryTree,
  previous: ParsedResume["workExperience"],
): ParsedResume["workExperience"] {
  return tree.map((role, index) => {
    const match = previous.find((work) => work.company === role.company && work.title === role.title) ?? previous[index];
    return {
      company: role.company,
      title: role.title,
      location: match?.location,
      startDate: role.startDate ?? undefined,
      endDate: role.endDate ?? undefined,
      isCurrent: match?.isCurrent ?? false,
      summary: match?.summary,
      skills: match?.skills ?? [],
      achievements: treeToAchievements(role),
    };
  });
}

export function editDataToTree(
  workExperiences: Array<{
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
  }>,
  bullets: Array<{ id: string; company: string; role: string; text: string }>,
): WorkHistoryTree {
  const groups = buildWorkHistoryGroups(workExperiences, bullets);
  const tree = groups.map((group) => ({
    kind: "role" as const,
    id: group.key,
    company: group.company,
    title: group.title,
    startDate: group.startDate,
    endDate: group.endDate,
    children: bulletsWithIdsToTree(group.bullets),
  }));
  return tree;
}

function bulletsWithIdsToTree(bullets: Array<{ id: string; text: string }>): WorkHistoryBulletNode[] {
  const roots: WorkHistoryBulletNode[] = [];
  let current: WorkHistoryBulletNode | null = null;

  for (const bullet of bullets) {
    const childMatch = bullet.text.match(/^(\s{2,})(.+)$/s);
    const node: WorkHistoryBulletNode = {
      kind: "bullet",
      id: bullet.id,
      text: childMatch ? childMatch[2].trim() : bullet.text.trim(),
      children: [],
    };
    if (childMatch && current) {
      current.children.push(node);
    } else {
      roots.push(node);
      current = node;
    }
  }

  return roots;
}

export function treeToDraftBullets(tree: WorkHistoryTree, previous: DraftBullet[]): DraftBullet[] {
  return tree.flatMap((role) => flattenRole(role, previous));
}

function flattenRole(role: WorkHistoryRoleNode, previous: DraftBullet[]): DraftBullet[] {
  return flattenBulletNodes(role.children, role.company, role.title, 0, previous);
}

function flattenBulletNodes(
  nodes: WorkHistoryBulletNode[],
  company: string,
  role: string,
  depth: number,
  previous: DraftBullet[],
): DraftBullet[] {
  const bullets: DraftBullet[] = [];
  for (const node of nodes) {
    const text = node.text.trim();
    if (!text && isTempNodeId(node.id)) {
      bullets.push(...flattenBulletNodes(node.children, company, role, depth + 1, previous));
      continue;
    }
    const storedText = depth > 0 ? `${"  ".repeat(depth)}${text}` : text;
    const existing = previous.find((bullet) => bullet.id === node.id);
    bullets.push({
      id: node.id,
      company,
      role,
      category: existing?.category ?? "frontend",
      text: storedText,
      keywords: existing?.keywords ?? [],
      sourceText: existing?.sourceText ?? storedText,
      truthLevel: existing?.truthLevel ?? "verified",
    });
    bullets.push(...flattenBulletNodes(node.children, company, role, depth + 1, previous));
  }
  return bullets;
}

export type WorkExperienceDraft = {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
};

export function treeToWorkExperienceDrafts(tree: WorkHistoryTree): WorkExperienceDraft[] {
  return tree.map((role) => ({
    company: role.company,
    title: role.title,
    startDate: role.startDate ?? null,
    endDate: role.endDate ?? null,
  }));
}
