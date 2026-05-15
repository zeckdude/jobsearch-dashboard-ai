CREATE TYPE "JoleneMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "JoleneConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextPath" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoleneConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JoleneMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "JoleneMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL DEFAULT '{}',
    "actionJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JoleneMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JoleneConversation_userId_contextPath_updatedAt_idx" ON "JoleneConversation"("userId", "contextPath", "updatedAt");

CREATE INDEX "JoleneMessage_conversationId_createdAt_idx" ON "JoleneMessage"("conversationId", "createdAt");

ALTER TABLE "JoleneConversation" ADD CONSTRAINT "JoleneConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JoleneMessage" ADD CONSTRAINT "JoleneMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "JoleneConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
