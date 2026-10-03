import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const success = new URL(request.url).searchParams.get("status") === "success";
  const message = success
    ? "Google Calendar connected"
    : "Google Calendar connection failed";
  const script = "window.close();";
  const scriptHash = createHash("sha256").update(script).digest("base64");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${message}</title></head><body><h1>${message}</h1><script>${script}</script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": `default-src 'none'; script-src 'sha256-${scriptHash}'; frame-ancestors 'none'; base-uri 'none'`,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
