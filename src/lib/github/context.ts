import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
};

export function githubUsernameFromUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  const match = trimmed.match(/github\.com\/([^/?#]+)/i);
  return match?.[1] ?? trimmed.replace(/^@/, "");
}

export async function syncGithubRepositories(userProfileId: string, githubUrl: string) {
  const username = githubUsernameFromUrl(githubUrl);
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "JobSearchOS/1.0",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} while syncing ${username}.`);
  }

  const repos = (await response.json()) as GithubRepo[];
  const saved = [];

  for (const repo of repos.filter((item) => !item.archived).slice(0, 80)) {
    saved.push(
      await prisma.githubRepository.upsert({
        where: {
          userProfileId_fullName: {
            userProfileId,
            fullName: repo.full_name,
          },
        },
        update: {
          githubId: String(repo.id),
          name: repo.name,
          htmlUrl: repo.html_url,
          description: repo.description,
          homepage: repo.homepage,
          language: repo.language,
          topics: (repo.topics ?? []) as Prisma.InputJsonValue,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          isFork: repo.fork,
          isArchived: repo.archived,
          pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          rawData: repo as Prisma.InputJsonValue,
        },
        create: {
          userProfileId,
          githubId: String(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          htmlUrl: repo.html_url,
          description: repo.description,
          homepage: repo.homepage,
          language: repo.language,
          topics: (repo.topics ?? []) as Prisma.InputJsonValue,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          isFork: repo.fork,
          isArchived: repo.archived,
          pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          rawData: repo as Prisma.InputJsonValue,
        },
      }),
    );
  }

  return { username, count: saved.length, repositories: saved };
}
