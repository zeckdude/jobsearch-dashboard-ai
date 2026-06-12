import { prisma } from "@/lib/prisma";

export async function loadFavoritedJobIds(userId: string) {
  const favorites = await prisma.jobFavorite.findMany({
    where: { userId },
    select: { jobPostingId: true },
  });
  return new Set(favorites.map((favorite) => favorite.jobPostingId));
}

export async function isJobFavorited(userId: string, jobPostingId: string) {
  const favorite = await prisma.jobFavorite.findUnique({
    where: {
      userId_jobPostingId: { userId, jobPostingId },
    },
    select: { id: true },
  });
  return Boolean(favorite);
}

export async function addJobFavorite(userId: string, jobPostingId: string) {
  const job = await prisma.jobPosting.findUnique({ where: { id: jobPostingId }, select: { id: true } });
  if (!job) throw new Error("Job not found.");

  await prisma.jobFavorite.upsert({
    where: { userId_jobPostingId: { userId, jobPostingId } },
    update: {},
    create: { userId, jobPostingId },
  });
  return { favorited: true as const };
}

export async function removeJobFavorite(userId: string, jobPostingId: string) {
  await prisma.jobFavorite.deleteMany({
    where: { userId, jobPostingId },
  });
  return { favorited: false as const };
}

export async function toggleJobFavorite(userId: string, jobPostingId: string) {
  const favorited = await isJobFavorited(userId, jobPostingId);
  if (favorited) return removeJobFavorite(userId, jobPostingId);
  return addJobFavorite(userId, jobPostingId);
}
