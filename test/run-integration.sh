#!/usr/bin/env bash

set -euo pipefail

if [ -n "${DATABASE_URL_TEST:-}" ]; then
  DATABASE_TEST_REQUIRED=true npx vitest run test/integration "$@"
else
  bash test/run-postgres-integration.sh "$@"
fi
