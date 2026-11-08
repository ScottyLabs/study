import { createHash, randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import * as oidc from "openid-client";
import { z } from "zod";

import { env } from "~/env";
import { attachPendingBlocks } from "~/server/api/profile";
import { db } from "~/server/db";

export const SESSION_COOKIE = "study_session";
export const SIGN_IN_COOKIE = "study_sign_in";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
export const SIGN_IN_MAX_AGE = 10 * 60;

const callbackURL = `${env.SERVER_URL}/api/auth/callback`;

export const secureCookies = env.SERVER_URL.startsWith("https://");

export type ServerSession = {
  session: { id: string; expiresAt: Date };
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    andrewID: string | null;
  };
};

const signInFlow = z.object({
  verifier: z.string(),
  state: z.string(),
  nonce: z.string(),
  next: z.string(),
});

type SignInFlow = z.infer<typeof signInFlow>;

let configuration: Promise<oidc.Configuration> | undefined;

function oidcConfiguration() {
  configuration ??= oidc
    .discovery(new URL(env.AUTH_ISSUER), env.AUTH_CLIENT_ID, env.AUTH_CLIENT_SECRET)
    .catch((error: unknown) => {
      configuration = undefined;
      throw error;
    });
  return configuration;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readCookie(header: string | null, name: string) {
  for (const part of header?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

// only same-origin paths, so the callback cannot redirect elsewhere
export function localPath(path: string | null | undefined) {
  const candidate = path ?? "";
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
}

export async function beginSignIn(next: string) {
  const config = await oidcConfiguration();
  const verifier = oidc.randomPKCECodeVerifier();
  const nonce = oidc.randomNonce();
  // ricochet routes the callback by return_to and forwards state unchanged
  const state = Buffer.from(
    JSON.stringify({ return_to: callbackURL, csrf: oidc.randomState() }),
  ).toString("base64url");
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: env.OAUTH_RELAY_URL,
    scope: "openid email profile",
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
  });
  const flow: SignInFlow = { verifier, state, nonce, next: localPath(next) };
  return {
    url,
    cookie: Buffer.from(JSON.stringify(flow)).toString("base64url"),
  };
}

function parseFlow(cookie: string | null): SignInFlow {
  if (cookie === null || cookie === "") throw new Error("Sign-in was not started in this browser");
  const flow = signInFlow.safeParse(JSON.parse(Buffer.from(cookie, "base64url").toString("utf8")));
  if (!flow.success) throw new Error("Malformed sign-in cookie");
  return flow.data;
}

async function upsertUser(claims: oidc.IDToken) {
  const email = typeof claims.email === "string" ? claims.email : undefined;
  if (email === undefined || email === "") throw new Error("Keycloak returned no email claim");
  const name = typeof claims.name === "string" ? claims.name : email;
  const andrewID = typeof claims.preferred_username === "string" ? claims.preferred_username : null;
  const emailVerified = claims.email_verified === true;

  const existing = await db.user.findUnique({
    where: { oidcSubject: claims.sub },
  });
  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: { email, name, andrewID, emailVerified },
    });
  }

  const user = await db.user.create({
    data: {
      id: randomUUID(),
      oidcSubject: claims.sub,
      email,
      name,
      andrewID,
      emailVerified,
    },
  });
  await attachPendingBlocks(user.id, user.email);
  return user;
}

export async function completeSignIn(request: Request, cookie: string | null) {
  const flow = parseFlow(cookie);
  const config = await oidcConfiguration();
  // the provider redirected to the relay, which is the registered redirect_uri
  const current = new URL(env.OAUTH_RELAY_URL);
  current.search = new URL(request.url).search;
  const tokens = await oidc.authorizationCodeGrant(config, current, {
    pkceCodeVerifier: flow.verifier,
    expectedState: flow.state,
    expectedNonce: flow.nonce,
  });
  const claims = tokens.claims();
  if (!claims) throw new Error("Keycloak returned no ID token");

  const user = await upsertUser(claims);
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      id: randomUUID(),
      token: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      userAgent: request.headers.get("user-agent"),
    },
  });
  return { token, next: flow.next };
}

export async function getSession(requestHeaders: Headers): Promise<ServerSession | null> {
  const token = readCookie(requestHeaders.get("cookie"), SESSION_COOKIE);
  if (token === null || token === "") return null;
  const session = await db.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return {
    session: { id: session.id, expiresAt: session.expiresAt },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      andrewID: session.user.andrewID,
    },
  };
}

export async function endSession(requestHeaders: Headers) {
  const token = readCookie(requestHeaders.get("cookie"), SESSION_COOKIE);
  if (token !== null && token !== "") {
    await db.session.deleteMany({ where: { token: hashToken(token) } });
  }
}

export async function requireServerSession() {
  return getSession(await headers());
}
