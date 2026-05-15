import { apiError } from "@/lib/api";
import { recordApplicationOutcome } from "@/lib/applications/outcomes";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await recordApplicationOutcome({
      applicationId: params.id,
      outcome: "APPLIED",
    });

    return Response.json({ outcome: result.outcome, message: result.message });
  } catch (error) {
    return apiError(error, 400);
  }
}
