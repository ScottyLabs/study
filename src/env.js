/** biome-ignore-all lint/style/useNamingConvention: environment variables are in SCREAMING_CASE */
import { z } from "zod";

// Define the schema as an object with all of the env variables and their types
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PRISMA_QUERY_LOG: z
      .enum(["true", "false", "1", "0"])
      .optional()
      .transform((value) => value === "true" || value === "1"),
    SERVER_URL: z.url(),
    SERVER_PORT: z.coerce.number().default(80),

    ADMIN_GROUP: z.string(),
    ALLOWED_ORIGINS_REGEX: z.string(),
    AUTH_ISSUER: z.url(),
    AUTH_CLIENT_ID: z.string().min(1),
    AUTH_CLIENT_SECRET: z.string().min(1),
    AUTH_JWKS_URI: z.url(),
    OAUTH_RELAY_URL: z.url(),
    DATABASE_URL: z.string(),
    CALENDAR_CLIENT_ID: z.string().min(1).optional(),
    CALENDAR_CLIENT_SECRET: z.string().min(1).optional(),
    CALENDAR_TOKEN_ENCRYPTION_KEY: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/u)
      .optional(),
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((value, context) => {
    const calendarSettings = [
      value.CALENDAR_CLIENT_ID,
      value.CALENDAR_CLIENT_SECRET,
      value.CALENDAR_TOKEN_ENCRYPTION_KEY,
    ];
    const hasCalendarSecrets = Boolean(
      value.CALENDAR_CLIENT_SECRET ?? value.CALENDAR_TOKEN_ENCRYPTION_KEY,
    );
    if (hasCalendarSecrets && !calendarSettings.every(Boolean)) {
      context.addIssue({
        code: "custom",
        message:
          "Calendar requires an OAuth client ID, CALENDAR_CLIENT_SECRET, and CALENDAR_TOKEN_ENCRYPTION_KEY when enabled",
      });
    }
  });

const realm = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`;
const hasOIDCClient = [process.env.OIDC_CLIENT_ID, process.env.OIDC_CLIENT_SECRET].some(
  (value) => value !== undefined,
);

// kennel and governance supply these under their own names
const env = envSchema.parse({
  SERVER_URL: process.env.APP_URL,
  SERVER_PORT: process.env.PORT,
  AUTH_ISSUER: realm,
  AUTH_JWKS_URI: `${realm}/protocol/openid-connect/certs`,
  ADMIN_GROUP: process.env.PROJECT_ADMIN_GROUP,
  ...process.env,
  // Keep provisioned credentials together; legacy .env values must not override them.
  AUTH_CLIENT_ID: hasOIDCClient ? process.env.OIDC_CLIENT_ID : process.env.AUTH_CLIENT_ID,
  AUTH_CLIENT_SECRET: hasOIDCClient
    ? process.env.OIDC_CLIENT_SECRET
    : process.env.AUTH_CLIENT_SECRET,
  CALENDAR_CLIENT_ID: process.env.CALENDAR_CLIENT_ID ?? process.env.NEXT_PUBLIC_CALENDAR_CLIENT_ID,
});

// Export the result so we can use it in the project
export { env };
