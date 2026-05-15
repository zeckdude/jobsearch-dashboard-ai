-- CreateTable
CREATE TABLE "EvidenceChunk" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embeddingModel" TEXT,
    "dimensions" INTEGER,
    "vector" JSONB NOT NULL DEFAULT '[]',
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceChunk_embeddingModel_updatedAt_idx" ON "EvidenceChunk"("embeddingModel", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceChunk_evidenceId_chunkIndex_key" ON "EvidenceChunk"("evidenceId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "EvidenceChunk" ADD CONSTRAINT "EvidenceChunk_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "CandidateEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
