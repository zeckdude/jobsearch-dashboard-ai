ALTER TABLE "Contact" ADD COLUMN "source" TEXT;
ALTER TABLE "Contact" ADD COLUMN "relevanceScore" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Contact_userId_relevanceScore_idx" ON "Contact"("userId", "relevanceScore");
