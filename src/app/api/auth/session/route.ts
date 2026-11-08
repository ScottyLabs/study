import { NextResponse } from "next/server";

import { getSession } from "~/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  return NextResponse.json(
    { user: session?.user ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
