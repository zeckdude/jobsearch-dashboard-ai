import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { commitResumeImport, importCommitSchema } from "@/lib/resumes/import-commit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 400 });

    const body = importCommitSchema.parse(await request.json());
    const result = await commitResumeImport(user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 400);
  }
}
