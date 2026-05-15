CREATE TYPE "CompanyAutoSubmitPolicyMode" AS ENUM ('INHERIT', 'ALLOW', 'BLOCK');

CREATE TABLE "CompanyAutomationPolicy" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "companyKey" TEXT NOT NULL,
  "autoSubmitMode" "CompanyAutoSubmitPolicyMode" NOT NULL DEFAULT 'INHERIT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyAutomationPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyAutomationPolicy_userId_companyKey_key" ON "CompanyAutomationPolicy"("userId", "companyKey");
CREATE INDEX "CompanyAutomationPolicy_userId_autoSubmitMode_idx" ON "CompanyAutomationPolicy"("userId", "autoSubmitMode");

ALTER TABLE "CompanyAutomationPolicy"
  ADD CONSTRAINT "CompanyAutomationPolicy_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
