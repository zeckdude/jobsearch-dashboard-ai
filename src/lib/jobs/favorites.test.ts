import { beforeEach, describe, expect, it, vi } from "vitest";
import { addJobFavorite, removeJobFavorite, toggleJobFavorite } from "@/lib/jobs/favorites";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobPosting: {
      findUnique: vi.fn(),
    },
    jobFavorite: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const findJobMock = vi.mocked(prisma.jobPosting.findUnique);
const findFavoriteMock = vi.mocked(prisma.jobFavorite.findUnique);
const upsertFavoriteMock = vi.mocked(prisma.jobFavorite.upsert);
const deleteFavoriteMock = vi.mocked(prisma.jobFavorite.deleteMany);

describe("job favorites", () => {
  beforeEach(() => {
    findJobMock.mockReset();
    findFavoriteMock.mockReset();
    upsertFavoriteMock.mockReset();
    deleteFavoriteMock.mockReset();
  });

  it("adds a favorite when the job exists", async () => {
    findJobMock.mockResolvedValue({ id: "job_1" } as Awaited<ReturnType<typeof prisma.jobPosting.findUnique>>);
    upsertFavoriteMock.mockResolvedValue({ id: "fav_1" } as Awaited<ReturnType<typeof prisma.jobFavorite.upsert>>);

    await expect(addJobFavorite("user_1", "job_1")).resolves.toEqual({ favorited: true });
    expect(upsertFavoriteMock).toHaveBeenCalledWith({
      where: { userId_jobPostingId: { userId: "user_1", jobPostingId: "job_1" } },
      update: {},
      create: { userId: "user_1", jobPostingId: "job_1" },
    });
  });

  it("removes a favorite idempotently", async () => {
    deleteFavoriteMock.mockResolvedValue({ count: 1 });

    await expect(removeJobFavorite("user_1", "job_1")).resolves.toEqual({ favorited: false });
    expect(deleteFavoriteMock).toHaveBeenCalledWith({
      where: { userId: "user_1", jobPostingId: "job_1" },
    });
  });

  it("toggles from favorited to unfavorited", async () => {
    findFavoriteMock.mockResolvedValue({ id: "fav_1" } as Awaited<ReturnType<typeof prisma.jobFavorite.findUnique>>);
    deleteFavoriteMock.mockResolvedValue({ count: 1 });

    await expect(toggleJobFavorite("user_1", "job_1")).resolves.toEqual({ favorited: false });
    expect(upsertFavoriteMock).not.toHaveBeenCalled();
  });

  it("toggles from unfavorited to favorited", async () => {
    findFavoriteMock.mockResolvedValue(null);
    findJobMock.mockResolvedValue({ id: "job_1" } as Awaited<ReturnType<typeof prisma.jobPosting.findUnique>>);
    upsertFavoriteMock.mockResolvedValue({ id: "fav_1" } as Awaited<ReturnType<typeof prisma.jobFavorite.upsert>>);

    await expect(toggleJobFavorite("user_1", "job_1")).resolves.toEqual({ favorited: true });
    expect(upsertFavoriteMock).toHaveBeenCalled();
  });
});
