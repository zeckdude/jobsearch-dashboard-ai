import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { auditApplicationIntegrity } from "@/lib/applications/integrity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await auditApplicationIntegrity();
    return NextResponse.json(report);
  } catch (error) {
    return apiError(error, 400);
  }
}
