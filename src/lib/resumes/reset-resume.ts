import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const emptyParsedSnapshot = {
  contactInfo: {},
  professionalSummary: "",
  skills: { coreSkills: [], technicalSkills: [], toolsFrameworksLibraries: [], programmingLanguages: [] },
  workExperience: [],
  experienceBullets: [],
  projects: [],
  education: [],
  certifications: [],
  additionalSections: [],
  inferredTags: [],
  fieldsNeedingReview: [],
  confidence: 0,
};

export async function resetResumeContent(userId: string) {
  const profile = await prisma.userProfile.findFirst({ where: { userId } });
  if (!profile) return { profileId: null };

  await prisma.experienceBullet.deleteMany({ where: { userProfileId: profile.id } });
  await prisma.workExperience.deleteMany({ where: { userProfileId: profile.id } });
  await prisma.project.deleteMany({ where: { userProfileId: profile.id } });

  await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      fullName: "",
      email: "",
      phone: null,
      location: null,
      professionalSummary: null,
      masterSummary: "",
      coreSkills: [] as Prisma.InputJsonValue,
      technicalSkills: [] as Prisma.InputJsonValue,
      domainExpertise: [] as Prisma.InputJsonValue,
    },
  });

  const uploads = await prisma.resumeUpload.findMany({
    where: { userProfileId: profile.id, userId },
    orderBy: { updatedAt: "desc" },
  });

  if (uploads.length > 0) {
    const [primary, ...rest] = uploads;
    await prisma.resumeUpload.update({
      where: { id: primary.id },
      data: {
        parsedJson: {
          ...emptyParsedSnapshot,
          contactInfo: {},
        } as Prisma.InputJsonValue,
        extractedText: "",
        parsingStatus: "failed",
      },
    });

    if (rest.length > 0) {
      await prisma.resumeUpload.updateMany({
        where: { id: { in: rest.map((upload) => upload.id) } },
        data: { parsingStatus: "failed" },
      });
    }
  }

  return { profileId: profile.id };
}
