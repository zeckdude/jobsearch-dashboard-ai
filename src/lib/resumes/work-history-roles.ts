import type { WorkHistoryRole } from "@/components/resumes/work-history-editor";
import {
  achievementsToTree,
  bulletsToTree,
  isTempBulletId,
  treeToAchievements,
  type ResumeBulletNode,
} from "@/lib/resumes/resume-bullet-tree";
import type { ParsedResume } from "@/lib/resumes/schemas";

type DraftBullet = {
  id: string;
  company: string;
  role: string;
  category: string;
  text: string;
  keywords: string[];
  sourceText: string | null;
  truthLevel: string;
};

export function parsedWorkToRoles(workExperience: ParsedResume["workExperience"]): WorkHistoryRole[] {
  return workExperience.map((work, index) => ({
    key: `${work.company}|${work.title}|${index}`,
    company: work.company,
    title: work.title,
    startDate: work.startDate ?? null,
    endDate: work.endDate ?? null,
    bullets: achievementsToTree(work.achievements),
  }));
}

export function rolesToParsedWork(
  roles: WorkHistoryRole[],
  previous: ParsedResume["workExperience"],
): ParsedResume["workExperience"] {
  return roles.map((role, index) => {
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
      achievements: treeToAchievements(role.bullets),
    };
  });
}

export function editGroupsToRoles(
  groups: Array<{
    key: string;
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    bullets: Array<{ id: string; text: string }>;
  }>,
): WorkHistoryRole[] {
  return groups.map((group) => ({
    key: group.key,
    company: group.company,
    title: group.title,
    startDate: group.startDate,
    endDate: group.endDate,
    bullets: bulletsToTree(group.bullets),
  }));
}

export function rolesToDraftBullets(roles: WorkHistoryRole[], previous: DraftBullet[]): DraftBullet[] {
  return roles.flatMap((role) => flattenRoleBullets(role.bullets, role.company, role.title, previous));
}

function flattenRoleBullets(
  nodes: ResumeBulletNode[],
  company: string,
  role: string,
  previous: DraftBullet[],
): DraftBullet[] {
  const bullets: DraftBullet[] = [];

  for (const node of nodes) {
    pushDraftBullet(bullets, node, company, role, previous, false);
    for (const child of node.children) {
      pushDraftBullet(bullets, child, company, role, previous, true);
    }
  }

  return bullets;
}

function pushDraftBullet(
  bullets: DraftBullet[],
  node: ResumeBulletNode,
  company: string,
  role: string,
  previous: DraftBullet[],
  isChild: boolean,
) {
  const text = node.text.trim();
  if (!text && isTempBulletId(node.id)) return;

  const storedText = isChild ? `  ${text}` : text;
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
}
