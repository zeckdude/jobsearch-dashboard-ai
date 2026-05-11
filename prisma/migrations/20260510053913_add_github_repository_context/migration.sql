-- CreateTable
CREATE TABLE "GithubRepository" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "description" TEXT,
    "homepage" TEXT,
    "language" TEXT,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "isFork" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "pushedAt" TIMESTAMP(3),
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GithubRepository_userProfileId_pushedAt_idx" ON "GithubRepository"("userProfileId", "pushedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GithubRepository_userProfileId_fullName_key" ON "GithubRepository"("userProfileId", "fullName");

-- AddForeignKey
ALTER TABLE "GithubRepository" ADD CONSTRAINT "GithubRepository_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
