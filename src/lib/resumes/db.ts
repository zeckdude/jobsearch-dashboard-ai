import type { ExperienceCategory } from "@prisma/client";

const categories = new Set([
  "frontend",
  "fullstack",
  "testing",
  "security",
  "ai",
  "leadership",
  "visualization",
  "saas",
  "design_systems",
  "devtools",
]);

export function toExperienceCategory(value: string): ExperienceCategory {
  return (categories.has(value) ? value : "frontend") as ExperienceCategory;
}
