# CMU Study

Find and manage CMU study groups.

## Development

- `npm run dev` starts the local Next.js app.
- `npm run build` creates a production build.
- `npx tsc --noEmit` runs TypeScript validation.
- `npm run test:unit` runs the Vitest UI/unit suite. `npm run test:integration` runs the Prisma-backed API and vertical tests; it requires `DATABASE_URL_TEST` to point to a dedicated disposable database (see `.env.test.example`), which must be migrated with `npx prisma migrate deploy` first.
- On the native NixOS CI runner, the test workflow launches and removes an isolated PostgreSQL instance with Nix; Docker is not required.
- `shell.nix` supplies a NixOS-compatible build of the exact Prisma engine commit pinned in `package-lock.json`; use `nix-shell` before running Prisma commands on NixOS.
- `GET /api/v1/health` verifies the Hono API boundary.
- `GET /api/v1/groups` returns groups ordered by start time; pass `courseCode` to filter by course.
- PostgreSQL is configured through `DATABASE_URL`; use `npm run db:generate` to create a migration after changing the Prisma schema.
- To connect to the Railway Postgres-dev database, create a local SSH key, upload to Railway, install the railway CLI, and run `railway connect Postgres-dev --tunnel-only`. Copy the given URL into the .env and .env.local DATABASE_URL before starting the app. You will need to be a member of the Railway project (if you have not been added yet, proceed with creating a local Postgress database).
- To create a local Postgres database with Docker, run:

  ```bash
  docker run --name studystarter-postgres \
    -e POSTGRES_USER=studystarter \
    -e POSTGRES_PASSWORD=studystarter \
    -e POSTGRES_DB=studystarter \
    -p 5433:5432 \
    -d postgres:17
  ```

  Then add this value to both `.env` and `.env.local`:

  ```env
  DATABASE_URL="postgresql://studystarter:studystarter@localhost:5433/studystarter?schema=public"
  ```

  Prisma CLI reads `.env`, while the Next.js app reads `.env.local`. After setting the URL, run `npx prisma migrate dev`, then start the app with `npm run dev`. Use `docker stop studystarter-postgres` and `docker start studystarter-postgres` to stop or restart the local database.

## Testing

Currently, very limited testing exists, and the goal is to build more tests as we implement and update code. This means you should be adding tests for every feature you work on, as you work on it. If it is a new feature, add new tests for that feature. Often it is better to define the tests (and minimally the specification) for the feature before starting the implementation, especially if using AI for the implementation. Use the existing tests to help write your tests. We use Vitest, with unit and integration tests. The integration tests test the database as well, so require a disposable test database to run. Run the tests using the following commands:

First, run:

```bash
npm install
```

Unit tests:

```bash
npm run test:unit
```

Then create the test database:

```bash
docker run --name studystarter-postgres-test \
  -e POSTGRES_USER=studystarter \
  -e POSTGRES_PASSWORD=studystarter \
  -e POSTGRES_DB=studystarter_test \
  -p 5434:5432 \
  -d postgres:17
```

Now run the integration tests:

```bash
export DATABASE_URL_TEST='postgresql://studystarter:studystarter@localhost:5434/studystarter_test?schema=public'

DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
npm run test:integration
```

All tests should run and pass before you make a PR. If a test fails, you likely have to change your code to pass the test. In general, the test itself should only ever be edited if you actually intend for the behavior to change. Remember to add more tests as you implement your feature (even if your feature is just improving on something, there probably are not tests for that something yet).

## Project Structure

- `src/app` contains Next.js routes and route layouts.
- `src/features/groups` contains study-group components, hooks, services, filters, and constants.
- `src/features/profile` contains profile components, hooks, services, and profile-specific types.
- `src/components` contains shared layout, provider, and UI components.
- `src/helpers` contains external integration helpers such as calendar/date utilities.
- `src/server/api` contains the Hono API application and route composition.
- `src/styles` contains global and component-level CSS.
