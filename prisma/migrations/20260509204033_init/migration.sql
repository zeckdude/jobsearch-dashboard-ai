-- CreateEnum
CREATE TYPE "SearchIntent" AS ENUM ('us_remote', 'global_remote', 'europe_relocation', 'specific_country', 'industry_specific', 'custom');

-- CreateEnum
CREATE TYPE "RemotePreference" AS ENUM ('remote_us_only', 'remote_global', 'remote_europe', 'hybrid', 'onsite_relocation', 'any');

-- CreateEnum
CREATE TYPE "RelocationPreference" AS ENUM ('not_interested', 'open_to_relocation', 'requires_relocation_support', 'visa_sponsorship_required', 'eu_blue_card_possible', 'unknown');

-- CreateEnum
CREATE TYPE "SalaryCurrency" AS ENUM ('USD', 'EUR', 'GBP', 'SEK');

-- CreateEnum
CREATE TYPE "JobSourceType" AS ENUM ('greenhouse', 'lever', 'ashby', 'remoteok', 'weworkremotely', 'company_site', 'manual');

-- CreateEnum
CREATE TYPE "RemoteType" AS ENUM ('remote', 'hybrid', 'onsite', 'unknown');

-- CreateEnum
CREATE TYPE "AtsProvider" AS ENUM ('greenhouse', 'lever', 'ashby', 'workday', 'workable', 'smartrecruiters', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "JobMatchStatus" AS ENUM ('discovered', 'needs_review', 'approved', 'rejected', 'saved_for_later', 'resume_generated', 'cover_letter_generated', 'ready_to_apply', 'applied', 'follow_up_due', 'screening', 'interviewing', 'rejected_by_company', 'offer', 'archived');

-- CreateEnum
CREATE TYPE "ExperienceCategory" AS ENUM ('frontend', 'fullstack', 'testing', 'security', 'ai', 'leadership', 'visualization', 'saas', 'design_systems', 'devtools');

-- CreateEnum
CREATE TYPE "TruthLevel" AS ENUM ('verified', 'inferred', 'estimated', 'needs_review');

-- CreateEnum
CREATE TYPE "ResumeParsingStatus" AS ENUM ('pending', 'parsed', 'needs_review', 'approved', 'failed');

-- CreateEnum
CREATE TYPE "SearchRunStatus" AS ENUM ('running', 'completed', 'failed', 'partial');

-- CreateEnum
CREATE TYPE "SearchRunTrigger" AS ENUM ('cron', 'manual');

-- CreateEnum
CREATE TYPE "ApplicationEventType" AS ENUM ('status_changed', 'note_added', 'resume_generated', 'cover_letter_generated', 'applied', 'follow_up_scheduled', 'follow_up_completed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('email', 'push', 'sms', 'web_push');

-- CreateEnum
CREATE TYPE "DigestMode" AS ENUM ('every_run', 'daily_summary', 'strong_matches_only');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "masterSummary" TEXT NOT NULL,
    "professionalSummary" TEXT,
    "yearsExperience" INTEGER,
    "primaryRoles" JSONB NOT NULL DEFAULT '[]',
    "coreSkills" JSONB NOT NULL DEFAULT '[]',
    "technicalSkills" JSONB NOT NULL DEFAULT '[]',
    "industries" JSONB NOT NULL DEFAULT '[]',
    "domainExpertise" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSearchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "searchIntent" "SearchIntent" NOT NULL DEFAULT 'custom',
    "titles" JSONB NOT NULL DEFAULT '[]',
    "excludedTitles" JSONB NOT NULL DEFAULT '[]',
    "jobTypes" JSONB NOT NULL DEFAULT '[]',
    "countries" JSONB NOT NULL DEFAULT '[]',
    "regions" JSONB NOT NULL DEFAULT '[]',
    "cities" JSONB NOT NULL DEFAULT '[]',
    "remotePreference" "RemotePreference" NOT NULL DEFAULT 'any',
    "relocationPreference" "RelocationPreference" NOT NULL DEFAULT 'unknown',
    "salaryCurrency" "SalaryCurrency" NOT NULL DEFAULT 'USD',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "includeUnknownSalary" BOOLEAN NOT NULL DEFAULT true,
    "industries" JSONB NOT NULL DEFAULT '[]',
    "preferredCompanies" JSONB NOT NULL DEFAULT '[]',
    "excludedCompanies" JSONB NOT NULL DEFAULT '[]',
    "keywordsRequired" JSONB NOT NULL DEFAULT '[]',
    "keywordsPreferred" JSONB NOT NULL DEFAULT '[]',
    "keywordsExcluded" JSONB NOT NULL DEFAULT '[]',
    "minimumMatchScore" INTEGER NOT NULL DEFAULT 75,
    "maxResultsPerRun" INTEGER NOT NULL DEFAULT 50,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT,
    "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minimumPushScore" INTEGER NOT NULL DEFAULT 85,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobSourceType" NOT NULL,
    "baseUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceJobId" TEXT,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "city" TEXT,
    "remoteType" "RemoteType" NOT NULL DEFAULT 'unknown',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" "SalaryCurrency",
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "niceToHaves" JSONB NOT NULL DEFAULT '[]',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "applicationUrl" TEXT,
    "atsProvider" "AtsProvider" NOT NULL DEFAULT 'unknown',
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProfileMatch" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "jobSearchProfileId" TEXT NOT NULL,
    "status" "JobMatchStatus" NOT NULL DEFAULT 'discovered',
    "overallScore" INTEGER NOT NULL,
    "titleFit" INTEGER NOT NULL,
    "skillFit" INTEGER NOT NULL,
    "seniorityFit" INTEGER NOT NULL,
    "industryFit" INTEGER NOT NULL,
    "compensationFit" INTEGER NOT NULL,
    "remoteFit" INTEGER NOT NULL,
    "relocationFit" INTEGER NOT NULL,
    "strongestMatches" JSONB NOT NULL DEFAULT '[]',
    "concerns" JSONB NOT NULL DEFAULT '[]',
    "missingKeywords" JSONB NOT NULL DEFAULT '[]',
    "recommendedAction" TEXT NOT NULL,
    "aiExplanation" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobProfileMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "jobProfileMatchId" TEXT,
    "status" "JobMatchStatus" NOT NULL DEFAULT 'approved',
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "resumeId" TEXT,
    "coverLetterId" TEXT,
    "notes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "sourceContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceBullet" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "workExperienceId" TEXT,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "category" "ExperienceCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "sourceText" TEXT,
    "truthLevel" "TruthLevel" NOT NULL DEFAULT 'verified',
    "sourceResumeUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceBullet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "jobProfileMatchId" TEXT NOT NULL,
    "resumeUploadId" TEXT,
    "markdown" TEXT NOT NULL,
    "html" TEXT,
    "pdfUrl" TEXT,
    "plainText" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "selectedBulletIds" JSONB NOT NULL DEFAULT '[]',
    "keywordAlignment" JSONB NOT NULL DEFAULT '{}',
    "generationNotes" JSONB NOT NULL DEFAULT '{}',
    "atsChecks" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "sourceResumeUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "repoUrl" TEXT,
    "technologies" JSONB NOT NULL DEFAULT '[]',
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "sourceResumeUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userProfileId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "extractedText" TEXT NOT NULL,
    "parsedJson" JSONB NOT NULL DEFAULT '{}',
    "parsingStatus" "ResumeParsingStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedCoverLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "jobProfileMatchId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generationNotes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedCoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSearchRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "SearchRunStatus" NOT NULL DEFAULT 'running',
    "triggeredBy" "SearchRunTrigger" NOT NULL DEFAULT 'manual',
    "profileIds" JSONB NOT NULL DEFAULT '[]',
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsAfterDedupe" INTEGER NOT NULL DEFAULT 0,
    "jobsAfterFilters" INTEGER NOT NULL DEFAULT 0,
    "jobsSaved" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ApplicationEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailAddress" TEXT,
    "pushoverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushoverUserKey" TEXT,
    "pushoverAppToken" TEXT,
    "notifyOnCronComplete" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnlyIfNewMatches" BOOLEAN NOT NULL DEFAULT true,
    "minimumScoreForPush" INTEGER NOT NULL DEFAULT 85,
    "digestMode" "DigestMode" NOT NULL DEFAULT 'strong_matches_only',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "JobSearchProfile_userId_enabled_idx" ON "JobSearchProfile"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "JobSearchProfile_userId_name_key" ON "JobSearchProfile"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_type_name_key" ON "JobSource"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_contentHash_key" ON "JobPosting"("contentHash");

-- CreateIndex
CREATE INDEX "JobPosting_company_title_idx" ON "JobPosting"("company", "title");

-- CreateIndex
CREATE INDEX "JobPosting_sourceId_sourceJobId_idx" ON "JobPosting"("sourceId", "sourceJobId");

-- CreateIndex
CREATE INDEX "JobPosting_applicationUrl_idx" ON "JobPosting"("applicationUrl");

-- CreateIndex
CREATE INDEX "JobProfileMatch_status_overallScore_idx" ON "JobProfileMatch"("status", "overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "JobProfileMatch_jobPostingId_jobSearchProfileId_key" ON "JobProfileMatch"("jobPostingId", "jobSearchProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearchProfile" ADD CONSTRAINT "JobSearchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProfileMatch" ADD CONSTRAINT "JobProfileMatch_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProfileMatch" ADD CONSTRAINT "JobProfileMatch_jobSearchProfileId_fkey" FOREIGN KEY ("jobSearchProfileId") REFERENCES "JobSearchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "GeneratedCoverLetter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobProfileMatchId_fkey" FOREIGN KEY ("jobProfileMatchId") REFERENCES "JobProfileMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "GeneratedResume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_sourceContactId_fkey" FOREIGN KEY ("sourceContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceBullet" ADD CONSTRAINT "ExperienceBullet_sourceResumeUploadId_fkey" FOREIGN KEY ("sourceResumeUploadId") REFERENCES "ResumeUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceBullet" ADD CONSTRAINT "ExperienceBullet_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceBullet" ADD CONSTRAINT "ExperienceBullet_workExperienceId_fkey" FOREIGN KEY ("workExperienceId") REFERENCES "WorkExperience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_jobProfileMatchId_fkey" FOREIGN KEY ("jobProfileMatchId") REFERENCES "JobProfileMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_resumeUploadId_fkey" FOREIGN KEY ("resumeUploadId") REFERENCES "ResumeUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_sourceResumeUploadId_fkey" FOREIGN KEY ("sourceResumeUploadId") REFERENCES "ResumeUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sourceResumeUploadId_fkey" FOREIGN KEY ("sourceResumeUploadId") REFERENCES "ResumeUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeUpload" ADD CONSTRAINT "ResumeUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeUpload" ADD CONSTRAINT "ResumeUpload_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedCoverLetter" ADD CONSTRAINT "GeneratedCoverLetter_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedCoverLetter" ADD CONSTRAINT "GeneratedCoverLetter_jobProfileMatchId_fkey" FOREIGN KEY ("jobProfileMatchId") REFERENCES "JobProfileMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedCoverLetter" ADD CONSTRAINT "GeneratedCoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
