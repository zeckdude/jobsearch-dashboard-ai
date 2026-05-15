import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { backfillEvidenceEmbeddings } from "@/lib/evidence/embeddings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await backfillEvidenceEmbeddings({
      force: Boolean(body.force),
      limit: typeof body.limit === "number" ? body.limit : 50,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 400);
  }
}
