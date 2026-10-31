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
| `npm test` or `npm run test:unit` | Every unit test in `src/` and `test/unit/`; these tests must not require PostgreSQL. |
| `npm run test:integration` | Every database-backed test in `test/integration/`; creates, migrates, and destroys a temporary PostgreSQL database unless `DATABASE_URL_TEST` is set. |
| `npm run test:all` | Runs the unit suite, then the integration suite only if unit tests pass, and prints a final pass/fail and test-count summary. |

All test commands use Vitest. The temporary database runner creates, migrates,
and destroys a test database. To use an existing dedicated test database
instead, set `DATABASE_URL_TEST` when invoking `npm run test:integration`:

```bash
DATABASE_URL_TEST="postgresql://.../dedicated_test_database" npm run test:integration
```

`DATABASE_URL_TEST` must be different from `DATABASE_URL`; never point it at a
development, shared, or production database.

### Test placement

Tests are assigned to a suite by location. Use the following rule whenever
adding a new `*.test.*` file:

| Test type | Location | Requirements |
| --- | --- | --- |
| Unit | Beside its source under `src/`, or in `test/unit/` | Must not require PostgreSQL. Frontend, server, and utility tests all belong here when their external state is mocked. |
| Integration | `test/integration/` | Requires PostgreSQL and must use the disposable `DATABASE_URL_TEST` database. |

The directory-based commands discover new test files automatically. Do not add
test files directly under `test/`.

To stop a suite after its first failed test, append Vitest's `--bail=1` flag:

```bash
npm run test:unit -- --bail=1
npm run test:integration -- --bail=1
npm run test:all -- --bail=1
```

The first `--` tells npm to pass `--bail=1` to Vitest rather than interpret it
as an npm option.

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

- `flake.nix` builds the deployable package

- `devenv.nix` declares the development environment and what kennel deploys.
