import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Realistic browser headers so sites don't fingerprint us as a bot/scraper.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

// Injected before the page's own scripts so window.top reads as self,
// neutralizing common "top !== self" frame-busting guards.
const FRAME_BUST_OVERRIDE = `<script>
(function(){try{Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});}catch(e){}})();
</script>`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url") ?? "";

  if (!/^https?:\/\//i.test(targetUrl)) {
    return errorPage("Invalid URL.");
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return errorPage("Malformed URL.");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        ...BROWSER_HEADERS,
        // Send the site's own origin as Referer — avoids some hotlink/referer checks.
        Referer: parsedTarget.origin + "/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return errorPage("The page returned a non-HTML response and can't be previewed.", targetUrl);
    }

    let html = await response.text();

    // Detect bot-protection / Cloudflare challenge pages before bothering to render.
    if (isBotChallengePage(response, html)) {
      return blockedPage(targetUrl);
    }

    // Resolve relative URLs against the final (post-redirect) URL.
    const finalUrl = response.url || targetUrl;
    const baseTag = `<base href="${finalUrl}">`;

    // Inject <base> right after <head> (or prepend if no <head>).
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${FRAME_BUST_OVERRIDE}`);
    } else {
      html = baseTag + FRAME_BUST_OVERRIDE + html;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // Deliberately omit X-Frame-Options and Content-Security-Policy
        // so the browser renders this inside our iframe without complaints.
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return errorPage(`Unable to load listing: ${message}`);
  }
}

function isBotChallengePage(response: Response, html: string): boolean {
  // Cloudflare: cf-ray header, server: cloudflare, or challenge body patterns
  if (response.headers.get("cf-ray") || response.headers.get("server")?.toLowerCase() === "cloudflare") return true;
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes("enable javascript and cookies") ||
    sample.includes("just a moment") ||
    sample.includes("challenge-platform") ||
    sample.includes("cf-browser-verification") ||
    sample.includes("checking your browser") ||
    sample.includes("ddos-guard") ||
    sample.includes("please wait while we verify") ||
    sample.includes("access denied") ||
    (response.status === 403 && sample.includes("cloudflare"))
  );
}

function blockedPage(url: string) {
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#555;display:flex;flex-direction:column;align-items:center;justify-content:center;height:90vh;text-align:center;gap:1.25rem;background:#fafafa;">
<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
<p style="margin:0;font-size:15px;font-weight:700;color:#111">Bot protection active</p>
<p style="margin:0;font-size:13px;max-width:280px">This site uses Cloudflare or a similar shield that requires a real browser session to load. The preview can't bypass it.</p>
<a href="${url}" target="_blank" rel="noreferrer" style="margin-top:0.5rem;display:inline-flex;align-items:center;gap:6px;background:#0f766e;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700">
  Open listing in new tab
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
</a>
</body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function errorPage(message: string, url?: string) {
  const linkHtml = url
    ? `<a href="${url}" target="_blank" rel="noreferrer" style="margin-top:0.5rem;display:inline-flex;align-items:center;gap:6px;color:#0f766e;font-size:13px;font-weight:700;text-decoration:none">Open in new tab <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`
    : "";
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#666;display:flex;flex-direction:column;align-items:center;justify-content:center;height:90vh;text-align:center;gap:1rem;background:#fafafa;">
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<p style="margin:0;font-size:14px">${message}</p>
${linkHtml}
</body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
