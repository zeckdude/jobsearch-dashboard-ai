import { apiError } from "@/lib/api";
import { setImprovementProposalStatus } from "@/lib/observability/quality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const proposal = await setImprovementProposalStatus(params.id, "DISMISSED");
    return Response.json({ ok: true, proposal });
  } catch (error) {
    return apiError(error, 400);
  }
}
