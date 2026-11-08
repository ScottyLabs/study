# CMU Study

Find and manage CMU study groups.

A Next.js app deployed by [kennel](https://docs.kennel.scottylabs.org/guides/deploying/).

## One-time setup

Install Lix and log in to OpenBao by following kennel's [local development](https://docs.kennel.scottylabs.org/guides/local-development/#installing-nix) and [secrets](https://docs.kennel.scottylabs.org/guides/secrets/#local-development) guides.

## Running the app

Enter the dev shell, which installs the dependencies, then start PostgreSQL, ricochet, and the app on http://localhost:3000 and apply the Prisma migrations:

```bash
nix develop
pitchfork start --local
migrate
```

## Tests

Run tests from the dev shell so they use the same Deno and PostgreSQL setup as the app. Start the local services with `pitchfork start --local` first, then apply the local migrations if you have not already done so:

```bash
nix develop
migrate
```

From that shell:

| Command | Runs |
| --- | --- |
| `deno task test` or `deno task test:unit` | Every unit test in `src/` and `test/unit/`; these tests must not require PostgreSQL. |
| `deno task test:integration` | Every database-backed test in `test/integration/`; creates, migrates, and destroys a temporary PostgreSQL database unless `DATABASE_URL_TEST` is set. |
| `deno task test:all` | Runs the unit suite, then the integration suite only if unit tests pass, and prints a final pass/fail and test-count summary. |

All test commands use Vitest. The temporary database runner creates, migrates,
and destroys a test database. To use an existing dedicated test database
instead, set `DATABASE_URL_TEST` when invoking `deno task test:integration`:

```bash
DATABASE_URL_TEST="postgresql://.../dedicated_test_database" deno task test:integration
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
deno task test:unit --bail=1
deno task test:integration --bail=1
deno task test:all --bail=1
```

## Database

`pitchfork start --local` runs PostgreSQL on a unix socket, and the dev shell exports `DATABASE_URL`. There is no password and no port to configure.

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

To add a secret, declare it in `secretspec.toml` and store it as described in kennel's [managing secrets](https://docs.kennel.scottylabs.org/guides/secrets/#managing-secrets) guide.

## Deployment

[Kennel](https://docs.kennel.scottylabs.org/guides/deploying/) deploys each open pull request as a [preview](https://docs.kennel.scottylabs.org/guides/previews/) at `study-web-pr-<number>.scottylabs.net` and each push to `main` to production at `cmustudy.com`, and reports progress as the `kennel/deploy` commit status.

## Project structure

- `src/app` contains Next.js routes and route layouts.

- `src/features/groups` contains study-group components, hooks, services, filters, and constants.

- `src/features/profile` contains profile components, hooks, services, and profile-specific types.

- `src/components` contains shared layout, provider, and UI components.

- `src/helpers` contains external integration helpers such as calendar/date utilities.

- `src/server/api` contains the Hono API application and route composition.

- `src/styles` contains global and component-level CSS.

- `flake.nix` declares the development environment, builds the deployable package, and declares what kennel deploys.
