import { NextResponse } from "next/server";

import { SIGN_IN_COOKIE, SIGN_IN_MAX_AGE, beginSignIn, secureCookies } from "~/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  const { url, cookie } = await beginSignIn(next ?? "/");
  const response = NextResponse.redirect(url);
  response.cookies.set(SIGN_IN_COOKIE, cookie, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: SIGN_IN_MAX_AGE,
  });
  return response;
}
