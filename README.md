# CMU Study

Find and manage CMU study groups.

A Next.js app deployed by [kennel](https://git.cmu.dev/ScottyLabs/kennel).

## One-time setup

Install [devenv](https://devenv.sh/getting-started/) and its shell hooks (stop before devenv init), then
sign in to OpenBao so secretspec can resolve this project's secrets:

```bash
nix run git+https://git.cmu.dev/ScottyLabs/kennel#login
```

## Running the app

Make sure you run `devenv allow` the first time you open the shell so the environment loads properly!

Starting services (postgres, ricochet):

```bash
devenv up
```

Once you see postgres ready and ricochet running, open a devenv shell:

```bash
devenv shell
npm ci
migrate               # applies prisma migrations
```

Run the app in the same devenv shell:

```bash
npm run dev
```

Keep `devenv up` running in its own terminal.

## Database

`devenv up` runs PostgreSQL on a unix socket and exports `DATABASE_URL`. There
is no password and no port to configure.

| Command | Does |
| --- | --- |
| `migrate` | applies pending migrations (`prisma migrate deploy`) |
| `migration` | creates a migration from schema changes (`prisma migrate dev`) |
| `studio` | opens Prisma Studio |

Deployed services migrate themselves on startup, so a migration ships with the
commit that needs it.

## Environment

Secrets live in OpenBao, declared in `secretspec.toml` and resolved per
environment by profile. Kennel supplies `DATABASE_URL`, `PORT`, and `APP_URL` at
runtime, so none of those are declared as secrets.

Only `src/env.js` may read the environment at runtime. Next inlines any direct
`process.env.FOO` at build time, so a value read that way in a component or
route handler is whatever it was during the build, not during the request.

You do not need a .env anymore, unless you are working on a feature that requires adding new environment variables that do not exist in OpenBao yet. You should delete your .env (or clear it) so it doesn't overwrite the OpenBao variables.

## Google Calendar

Calendar uses server-side OAuth authorization-code flow through the same
Ricochet callback relay as Keycloak. Google sends a code to `OAUTH_RELAY_URL`;
Ricochet forwards it to the originating app's `/api/calendar/oauth/callback`.
The app exchanges the code using the relay URL as its redirect URI. Google
credentials are encrypted in PostgreSQL and never returned to the browser.

Before implementation or rollout, confirm that the deployed client belongs to
the intended Google Cloud project. The reported production setup is **External,
In Production**, with both current Calendar scopes approved; verify these exact
scopes on Google Auth Platform's Data Access and verification pages:

- `https://www.googleapis.com/auth/calendar.events.owned`
- `https://www.googleapis.com/auth/calendar.freebusy`

Publishing alone does not approve sensitive scopes. Unapproved scopes can show
an unverified-app warning and impose a lifetime user cap. External projects in
Testing allow up to 100 listed test users and expire Calendar authorizations,
including refresh tokens, after seven days. Use that mode only for limited
pilots. Internal projects restrict Google accounts to the owning organization
and do not support the current user-selected-account audience. See
[Google's audience rules](https://support.google.com/cloud/answer/15549945?hl=en).

Setup:

1. Enable the Google Calendar API. Use a **Web application** OAuth client and
   register the exact `OAUTH_RELAY_URL` as an authorized redirect URI. Do not
   register individual PR preview origins for this server-initiated flow.
1. Ensure Ricochet allows the production and preview hosts. Local development
   uses its loopback configuration and a Google-registered local relay URL.
1. Keep the existing `NEXT_PUBLIC_CALENDAR_CLIENT_ID`; the server reuses it.
   `CALENDAR_CLIENT_ID` is an optional override if a separate server client is
   needed. Set `CALENDAR_CLIENT_SECRET` for that same OAuth client and
   `CALENDAR_TOKEN_ENCRYPTION_KEY` through secretspec/OpenBao for each environment.
   The encryption key is 32 random bytes encoded as 64 hexadecimal characters;
   generate it with `openssl rand -hex 32`. Keep it stable across redeployments.
   Changing it requires users to reconnect. All three settings must be provided
   for Calendar to be enabled. The existing public client ID alone leaves
   Calendar disabled without disabling study groups. `NEXT_PUBLIC_CALENDAR_API_KEY`
   is not needed by the server flow and cannot replace the OAuth client secret.
1. Apply the additive Prisma migration before starting the new application.
   Existing Calendar event IDs are retained.

Existing users connect again to establish server credentials. Later requests
refresh access tokens automatically while Google's refresh credentials remain
valid. Expiration or revocation requires reconnection; this is not a permanent
authorization guarantee. Each preview has its own connection, isolated by
StudyStarter user and application origin. Repeated connections across many PRs
can also reach [Google's refresh-token issuance limits](https://developers.google.com/identity/protocols/oauth2#expiration).

Authorization opens a popup without navigating the current form. The page polls
its session-bound attempt, so Google's opener isolation does not prevent
completion. Denial, failure, and a five-minute timeout settle the request. If
the browser severs the popup reference, manually closing it may be detected
only by the timeout. Calendar failures retain the existing group-action behavior.

Run `npm run test:calendar`, `npx tsc --noEmit`, and `npm run lint`. Before broad
rollout, manually connect and create, edit, and delete events on two PR previews
using the same registered relay URL, then check production and local settings.
Do not log callback query strings, authorization codes, or decrypted tokens in
application or reverse-proxy access logs.

The PostgreSQL integration test also runs when `CALENDAR_TEST_DATABASE_URL`
points to a dedicated, migrated test database. It creates and removes its own
test user; do not point this setting at production.

## Deployment

Pushing `main`, `staging`, or `dev` deploys that branch. Any other branch is
deployed as a preview once a pull request is open, at
`study-web-pr-<number>.scottylabs.net`. Progress shows up as the
`kennel/build` and `kennel/deploy` commit statuses, and production is served at
`cmustudy.com`.

## Project structure

- `src/app` contains Next.js routes and route layouts.
- `src/features/groups` contains study-group components, hooks, services, filters, and constants.
- `src/features/profile` contains profile components, hooks, services, and profile-specific types.
- `src/components` contains shared layout, provider, and UI components.
- `src/helpers` contains external integration helpers such as calendar/date utilities.
- `src/server/api` contains the Hono API application and route composition.
- `src/styles` contains global and component-level CSS.
- `flake.nix` builds the deployable package
- `devenv.nix` declares the development environment and what kennel deploys.
