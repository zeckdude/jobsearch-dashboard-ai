CREATE TYPE "EmailOAuthConnectionStatus" AS ENUM ('CONNECTED', 'NEEDS_REAUTH', 'DISABLED');

CREATE TABLE "EmailOAuthConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "EmailProvider" NOT NULL,
  "emailAddress" TEXT,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "scopes" JSONB NOT NULL DEFAULT '[]',
  "status" "EmailOAuthConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailOAuthConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailOAuthConnection_userId_provider_key" ON "EmailOAuthConnection"("userId", "provider");
CREATE INDEX "EmailOAuthConnection_userId_status_idx" ON "EmailOAuthConnection"("userId", "status");

ALTER TABLE "EmailOAuthConnection"
  ADD CONSTRAINT "EmailOAuthConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
