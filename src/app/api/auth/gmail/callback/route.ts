import { GET as emailOAuthCallback } from "@/app/api/email/oauth/[provider]/callback/route";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return emailOAuthCallback(request, { params: { provider: "gmail" } });
}
