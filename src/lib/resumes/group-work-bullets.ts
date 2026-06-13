type WorkExperienceLike = {
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  createdAt?: string | Date;
};

type BulletLike = {
  id: string;
  company: string;
  role: string;
  text: string;
  truthLevel: string;
  category: string;
};

export type WorkHistoryGroup<TWork extends WorkExperienceLike = WorkExperienceLike, TBullet extends BulletLike = BulletLike> = {
  key: string;
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  bullets: TBullet[];
  work?: TWork;
};

export function buildWorkHistoryGroups<TWork extends WorkExperienceLike, TBullet extends BulletLike>(
  workExperiences: TWork[],
  bullets: TBullet[],
): WorkHistoryGroup<TWork, TBullet>[] {
  const chronologicalWork = sortWorkExperiences(workExperiences);
  const workByKey = new Map(chronologicalWork.map((work) => [workKey(work.company, work.title), work]));
  const groups = new Map<string, TBullet[]>();

  for (const bullet of bullets) {
    const key = workKey(bullet.company, bullet.role);
    groups.set(key, [...(groups.get(key) ?? []), bullet]);
  }

  for (const work of chronologicalWork) {
    const key = workKey(work.company, work.title);
    if (!groups.has(key)) groups.set(key, []);
  }

  return Array.from(groups.entries())
    .sort(([leftKey], [rightKey]) => {
      const leftWork = workByKey.get(leftKey);
      const rightWork = workByKey.get(rightKey);
      const leftDate = workSortValue(leftWork);
      const rightDate = workSortValue(rightWork);
      if (leftDate !== rightDate) return rightDate - leftDate;
      return leftKey.localeCompare(rightKey);
    })
    .map(([key, roleBullets]) => {
      const work = workByKey.get(key);
      const [company, title] = work ? [work.company, work.title] : displayKeyParts(key);
      return {
        key,
        company,
        title,
        startDate: work?.startDate ?? null,
        endDate: work?.endDate ?? null,
        bullets: roleBullets,
        work,
      };
    });
}

function sortWorkExperiences<T extends WorkExperienceLike>(workExperiences: T[]) {
  const seen = new Set<string>();
  return [...workExperiences]
    .sort((a, b) => {
      const dateDiff = workSortValue(b) - workSortValue(a);
      if (dateDiff !== 0) return dateDiff;
      const leftCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const rightCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return rightCreated - leftCreated;
    })
    .filter((work) => {
      const dedupeKey = `${workKey(work.company, work.title)}|${work.startDate ?? ""}|${work.endDate ?? ""}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });
}

function workSortValue(work: WorkExperienceLike | undefined) {
  if (!work) return 0;
  return Math.max(parseResumeDate(work.endDate, work.isCurrent), parseResumeDate(work.startDate, false));
}

function parseResumeDate(value: string | null | undefined, isCurrent: boolean) {
  if (isCurrent || /present|current|now/i.test(value ?? "")) return 999999;
  if (!value) return 0;
  const match = value.match(/(?:(\d{1,2})\/)?(\d{4})|(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(\d{4})/i);
  if (!match) return 0;
  if (match[2] && match[1]) return Number(match[2]) * 100 + Number(match[1]);
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const month = match[3] ? months[match[3].toLowerCase()] ?? 12 : 12;
  const year = Number(match[4] ?? match[2]);
  return year * 100 + month;
}

function workKey(company: string, title: string) {
  return `${normalizeWorkKey(company)}|${normalizeWorkKey(title)}`;
}

function normalizeWorkKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function displayKeyParts(key: string) {
  const [company, role] = key.split("|");
  return [titleCase(company ?? ""), titleCase(role ?? "")];
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
