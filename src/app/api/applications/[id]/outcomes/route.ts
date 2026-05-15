import { ApplicationOutcomeType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { recordApplicationOutcome } from "@/lib/applications/outcomes";

export const dynamic = "force-dynamic";

const outcomeSchema = z.object({
  outcome: z.nativeEnum(ApplicationOutcomeType),
  notes: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = outcomeSchema.parse(await request.json());
    const result = await recordApplicationOutcome({
      applicationId: params.id,
      outcome: body.outcome,
      notes: body.notes,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
