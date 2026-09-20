# CMU Study

Find and manage CMU study groups.

## Development

- `npm run dev` starts the local Next.js app.
- `npm run build` creates a production build.
- `npx tsc --noEmit` runs TypeScript validation.
- `GET /api/v1/health` verifies the Hono API boundary.
- `GET /api/v1/groups` returns groups ordered by start time; pass `courseCode` to filter by course.
- PostgreSQL is configured through `DATABASE_URL`; use `npm run db:generate` to create a migration after changing the Prisma schema.
- To connect to the Railway Postgres-dev database, create a local SSH key, upload to Railway, install the railway CLI, and run `railway connect Postgres-dev --tunnel-only`. Copy the given URL into the .env and .env.local DATABASE_URL before starting the app. You will need to be a member of the Railway project (if you have not been added yet, proceed with creating a local Postgress database).
- To create a local Postgres database with Docker, run:
<<<<<<< HEAD
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
=======
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
>>>>>>> 255528a2fb47db716a92981d47094892d13429d3

## Project Structure

- `src/app` contains Next.js routes and route layouts.
- `src/features/groups` contains study-group components, hooks, services, filters, and constants.
- `src/features/profile` contains profile components, hooks, services, and profile-specific types.
- `src/components` contains shared layout, provider, and UI components.
- `src/helpers` contains external integration helpers such as calendar/date utilities.
- `src/server/api` contains the Hono API application and route composition.
- `src/styles` contains global and component-level CSS.