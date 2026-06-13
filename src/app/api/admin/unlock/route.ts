import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { ADMIN_GATE_COOKIE, createAdminGateToken, verifyAdminPassword } from "@/lib/admin/gate";

export const dynamic = "force-dynamic";

const unlockSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = unlockSchema.parse(await request.json());
    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const token = createAdminGateToken();
    if (!token) {
      return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_GATE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return apiError(error, 400);
  }
}
