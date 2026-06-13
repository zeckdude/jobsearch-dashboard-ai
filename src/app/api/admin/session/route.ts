import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "@/lib/admin/gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(ADMIN_GATE_COOKIE)?.value;
  return NextResponse.json({ active: verifyAdminGateToken(token) });
}
