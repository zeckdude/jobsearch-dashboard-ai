-- CreateTable
CREATE TABLE "EvidenceEmbedding" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "vector" JSONB NOT NULL DEFAULT '[]',
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceEmbedding_model_createdAt_idx" ON "EvidenceEmbedding"("model", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceEmbedding_evidenceId_model_contentHash_key" ON "EvidenceEmbedding"("evidenceId", "model", "contentHash");

-- AddForeignKey
ALTER TABLE "EvidenceEmbedding" ADD CONSTRAINT "EvidenceEmbedding_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "CandidateEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
