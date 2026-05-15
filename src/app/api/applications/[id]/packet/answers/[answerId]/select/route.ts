import { z } from "zod";
import { apiError } from "@/lib/api";
import { selectApplicationPacketAnswerOption } from "@/lib/applications/application-packets";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  optionIndex: z.number().int().min(0),
});

export async function POST(request: Request, { params }: { params: { id: string; answerId: string } }) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = await selectApplicationPacketAnswerOption(params.id, params.answerId, body.optionIndex);
    return Response.json(result);
  } catch (error) {
    return apiError(error, 400);
  }
}
