import { NextResponse } from "next/server";

import { SESSION_COOKIE, endSession } from "~/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await endSession(request.headers);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return response;
}
