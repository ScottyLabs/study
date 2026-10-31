if (!process.env.CALENDAR_TEST_DATABASE_URL) {
  throw new Error(
    "CALENDAR_TEST_DATABASE_URL is required for integration tests. In a devenv shell, run CALENDAR_TEST_DATABASE_URL=\"$DATABASE_URL\" npm run test:integration.",
  );
}
