import { CompanyAutoSubmitPolicyMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { upsertCompanyAutomationPolicy } from "@/lib/applications/auto-submit-policy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const companyAutomationSchema = z.object({
  company: z.string().trim().min(1).max(300),
  autoSubmitMode: z.nativeEnum(CompanyAutoSubmitPolicyMode),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ policies: [] });

    const policies = await prisma.companyAutomationPolicy.findMany({
      where: { userId: user.id },
      orderBy: [{ autoSubmitMode: "asc" }, { company: "asc" }],
      take: 200,
    });

    return NextResponse.json({ policies });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function POST(request: Request) {
  try {
    const body = companyAutomationSchema.parse(await request.json());
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user exists. Run seed first." }, { status: 400 });

    const policy = await upsertCompanyAutomationPolicy({
      userId: user.id,
      company: body.company,
      autoSubmitMode: body.autoSubmitMode,
      notes: body.notes,
    });

    return NextResponse.json({
      policy,
      message: companyPolicyMessage(policy.company, policy.autoSubmitMode),
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

function companyPolicyMessage(company: string, mode: CompanyAutoSubmitPolicyMode) {
  if (mode === "ALLOW") return `Auto-submit allowed for ${company}. Safety gates still apply.`;
  if (mode === "BLOCK") return `Auto-submit blocked for ${company}.`;
  return `${company} now inherits global auto-submit settings.`;
}
