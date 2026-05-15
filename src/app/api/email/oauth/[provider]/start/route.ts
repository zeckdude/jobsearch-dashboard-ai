import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildEmailOAuthAuthorizeUrl, normalizeEmailOAuthProvider } from "@/lib/email/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { provider: string } }) {
  try {
    const provider = normalizeEmailOAuthProvider(params.provider);
    if (!provider) return NextResponse.json({ error: "Unsupported email OAuth provider." }, { status: 404 });

    const state = randomBytes(24).toString("hex");
    const origin = new URL(request.url).origin;
    const url = buildEmailOAuthAuthorizeUrl({ provider, state, origin });
    const response = NextResponse.redirect(url);
    response.cookies.set(`email_oauth_state_${provider}`, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return apiError(error, 400);
  }
}
