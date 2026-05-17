import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { repairApplicationIntegrity } from "@/lib/applications/integrity";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await repairApplicationIntegrity();
    return NextResponse.json({
      ...result,
      message: result.repaired
        ? `Repaired ${result.repaired} application state issue${result.repaired === 1 ? "" : "s"}.`
        : "Application state is already synced.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
