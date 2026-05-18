import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildApplicationAssistantPackage, findReadyApplicationByUrl } from "@/lib/applications/assistant-package";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageUrl = url.searchParams.get("url");
    if (!pageUrl) {
      return NextResponse.json({ error: "Missing url query parameter." }, { status: 400 });
    }
    const application = await findReadyApplicationByUrl(pageUrl);
    const result = await buildApplicationAssistantPackage(application, url.origin);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return apiError(error, 400);
  }
}
