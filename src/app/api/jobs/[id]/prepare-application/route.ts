import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prepareApplicationPackage } from "@/lib/applications/prepare-package";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await prepareApplicationPackage(params.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 400);
  }
}
