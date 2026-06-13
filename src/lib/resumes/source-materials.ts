import type { ExperienceBullet, WorkExperience } from "@prisma/client";

export function selectResumeSourceBullets<T extends Pick<ExperienceBullet, "text">>(bullets: T[]) {
  return dedupeBullets(bullets);
}

export function selectResumeSourceWorkExperiences<T extends Pick<WorkExperience, "company" | "title">>(workExperiences: T[]) {
  return workExperiences;
}

export function summarizeResumeSourceBullets<T extends Pick<ExperienceBullet, "id" | "metrics">>(bullets: T[]) {
  const roleDescriptionDigestBulletIds = bullets
    .filter((bullet) => isRoleDescriptionDigestBullet(bullet))
    .map((bullet) => bullet.id);

  return {
    totalBulletCount: bullets.length,
    profileBulletCount: bullets.length,
    latestUploadBulletCount: 0,
    roleDescriptionDigestBulletIds,
  };
}

function dedupeBullets<T extends Pick<ExperienceBullet, "text">>(bullets: T[]) {
  const seen = new Set<string>();
  return bullets.filter((bullet) => {
    const key = bullet.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRoleDescriptionDigestBullet<T extends Pick<ExperienceBullet, "metrics">>(bullet: T) {
  return Boolean(
    bullet.metrics &&
      typeof bullet.metrics === "object" &&
      !Array.isArray(bullet.metrics) &&
      "source" in bullet.metrics &&
      bullet.metrics.source === "role_description_digest",
  );
}
