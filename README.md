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
