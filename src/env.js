/** biome-ignore-all lint/style/useNamingConvention: environment variables are in SCREAMING_CASE */
import { z } from "zod";

// Define the schema as an object with all of the env variables and their types
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PRISMA_QUERY_LOG: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => value === "true" || value === "1"),
  SERVER_URL: z.string().url(),
  SERVER_PORT: z.coerce.number().default(80),

  ADMIN_GROUP: z.string(),
  ALLOWED_ORIGINS_REGEX: z.string(),
  AUTH_ISSUER: z.string().url(),
  AUTH_CLIENT_ID: z.string(),
  AUTH_CLIENT_SECRET: z.string(),
  AUTH_JWKS_URI: z.string().url(),
  OAUTH_RELAY_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().url(), // https://www.better-auth.com/docs/installation#set-environment-variables
  DATABASE_URL: z.string(),
  SENTRY_DSN: z.string().optional(),
});

const realm = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`;

// kennel and governance supply these under their own names
const env = envSchema.parse({
  SERVER_URL: process.env.APP_URL,
  BETTER_AUTH_URL: process.env.APP_URL,
  SERVER_PORT: process.env.PORT,
  AUTH_ISSUER: realm,
  AUTH_JWKS_URI: `${realm}/protocol/openid-connect/certs`,
  AUTH_CLIENT_ID: process.env.OIDC_CLIENT_ID,
  AUTH_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
  ADMIN_GROUP: process.env.PROJECT_ADMIN_GROUP,
  ...process.env,
});

// Export the result so we can use it in the project
export { env };
