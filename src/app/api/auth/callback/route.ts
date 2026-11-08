import { NextResponse } from "next/server";

import { env } from "~/env";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SIGN_IN_COOKIE,
  completeSignIn,
  readCookie,
  secureCookies,
} from "~/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookie = readCookie(request.headers.get("cookie"), SIGN_IN_COOKIE);
  let response: NextResponse;
  try {
    const { token, next } = await completeSignIn(request, cookie);
    response = NextResponse.redirect(new URL(next, env.SERVER_URL));
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } catch (error) {
    console.warn("Sign-in callback failed", error);
    response = NextResponse.redirect(new URL("/?error=sign_in", env.SERVER_URL));
  }
  response.cookies.delete({ name: SIGN_IN_COOKIE, path: "/api/auth" });
  return response;
}
