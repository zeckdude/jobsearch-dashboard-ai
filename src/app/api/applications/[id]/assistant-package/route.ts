import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { applicationAssistantPackageForId } from "@/lib/applications/assistant-package";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await applicationAssistantPackageForId(params.id, new URL(request.url).origin);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return apiError(error, 400);
  }
}
