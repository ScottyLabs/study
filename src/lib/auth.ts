import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, keycloak } from "better-auth/plugins";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";

import { env } from "~/env";
import { db } from "~/server/db";
import { attachPendingBlocks } from "~/server/api/profile";

const baseURL = env.BETTER_AUTH_URL ?? env.SERVER_URL;
const keycloakCallbackURL = `${baseURL}/api/auth/oauth2/callback/keycloak`;

const relayState = () =>
  Buffer.from(
    JSON.stringify({ return_to: keycloakCallbackURL, csrf: randomUUID() }),
  ).toString("base64url");

const keycloakConfig = {
  ...keycloak({
    clientId: env.AUTH_CLIENT_ID,
    clientSecret: env.AUTH_CLIENT_SECRET,
    issuer: env.AUTH_ISSUER,
    redirectURI: env.OAUTH_RELAY_URL,
    overrideUserInfo: true,
    pkce: true,
  }),
  authorizationUrlParams: () => ({
    state: relayState(),
  }),
  mapProfileToUser: (profile: Record<string, unknown>) => {
    const andrewID = profile.preferred_username;

    return typeof andrewID === "string"
      ? ({ andrewID } as never)
      : {};
  },
};

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [baseURL],
  // Needed for ricochet functionality, so betterauth doesn't rewrite cookie
  account: { storeStateStrategy: "cookie" },
  user: {
    additionalFields: {
      andrewID: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await attachPendingBlocks(user.id, user.email);
        },
      },
    },
  },
  plugins: [
    nextCookies(),
    genericOAuth({
      config: [keycloakConfig],
    }),
  ],
});

export async function getServerSession() {
  return auth.api.getSession({
    headers: headers(),
  });
}

export async function requireServerSession() {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  return session;
}
