if (!process.env.DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL_TEST is required for integration tests. It must point to a dedicated, disposable test database.",
  );
}

if (process.env.DATABASE_URL_TEST === process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL_TEST must be separate from DATABASE_URL to protect development data.",
  );
}
