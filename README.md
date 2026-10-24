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

## Tests

Run tests from a devenv shell so they use the same Node.js and PostgreSQL setup
as the app. Start `devenv up` in another terminal first, then install
dependencies and apply the local migrations if you have not already done so:

```bash
devenv shell
npm ci
migrate
```

From that shell:

| Command | Runs |
| --- | --- |
| `npm run test:unit` | Tests that do not use PostgreSQL. |
| `CALENDAR_TEST_DATABASE_URL="$DATABASE_URL" npm run test:integration` | PostgreSQL-backed tests against the local devenv database. |
| `npm run test:calendar` | The full Calendar suite; its database test is skipped unless `CALENDAR_TEST_DATABASE_URL` is set. |

The integration test creates and removes its own temporary test records. Do not
point `CALENDAR_TEST_DATABASE_URL` at a shared or production database.

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

## Deployment and CI

The Forgejo `Test` workflow runs only when a pull request is opened, reopened,
or updated. It runs unit tests first and only starts the PostgreSQL integration
tests after they pass. It does not run again for ordinary branch pushes or when
a pull request is merged.

Kennel independently receives Forgejo's pull-request and push webhooks: an open
pull request gets a preview at `study-web-pr-<number>.scottylabs.net`, and a
push to `main` deploys production at `cmustudy.com`. Kennel currently starts
those deployments as soon as it receives its webhook; the repository workflow
cannot make it wait for CI. Configure the two `Test` workflow job statuses as
required checks for `main` so an untested or failing pull request cannot be
merged and therefore cannot reach production. Progress for the independent
Kennel build and deployment appears as `kennel/build` and `kennel/deploy`
commit statuses.

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
