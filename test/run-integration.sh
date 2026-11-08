#!/usr/bin/env bash

set -euo pipefail

if [ -n "${DATABASE_URL_TEST:-}" ]; then
  # deno segfaults loading Prisma's query engine in a vitest worker
  DATABASE_TEST_REQUIRED=true node node_modules/vitest/vitest.mjs run test/integration "$@"
else
  bash test/run-postgres-integration.sh "$@"
fi
