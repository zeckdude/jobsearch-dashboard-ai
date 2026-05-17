import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { controlGraphAgentRun } from "@/lib/agents/graph-run-controls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["resume", "retry", "cancel", "repair"]),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const input = requestSchema.parse(body);
    const result = await controlGraphAgentRun(params.id, input.action);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 400);
  }
}
