#!/usr/bin/env bash

set -euo pipefail

locked_prisma_engine_commit="$(node -e '
  const lock = require("./package-lock.json");
  const version = lock.packages["node_modules/@prisma/engines-version"].version;
  console.log(version.split(".").at(-1));
')"

if [ "${locked_prisma_engine_commit}" != "${STUDYSTARTER_PRISMA_ENGINE_COMMIT:?}" ]; then
  echo "The Nix Prisma engine does not match package-lock.json." >&2
  echo "Expected ${locked_prisma_engine_commit}; got ${STUDYSTARTER_PRISMA_ENGINE_COMMIT}." >&2
  exit 1
fi

test_port="${TEST_POSTGRES_PORT:-54329}"
test_temp_root="${RUNNER_TEMP:-/tmp}"
test_data_dir="$(mktemp -d "${test_temp_root%/}/studystarter-postgres.XXXXXX")"
test_socket_dir="$(mktemp -d /tmp/studystarter-pg-socket.XXXXXX)"
test_log_file="${test_data_dir}/postgres.log"
test_database_url="postgresql://studystarter@127.0.0.1:${test_port}/studystarter_test?schema=public"

cleanup() {
  local status=$?
  set +e

  if [ "${status}" -ne 0 ] && [ -f "${test_log_file}" ]; then
    cat "${test_log_file}"
  fi

  if [ -f "${test_data_dir}/postmaster.pid" ]; then
    pg_ctl -D "${test_data_dir}" -m immediate stop >/dev/null 2>&1
  fi

  rm -rf -- "${test_data_dir}"
  rm -rf -- "${test_socket_dir}"
  exit "${status}"
}

trap cleanup EXIT

initdb \
  --pgdata="${test_data_dir}" \
  --username=studystarter \
  --auth=trust \
  --encoding=UTF8 \
  --no-locale

pg_ctl \
  --pgdata="${test_data_dir}" \
  --log="${test_log_file}" \
  --wait \
  start \
  --options="-h 127.0.0.1 -p ${test_port} -k ${test_socket_dir}"

createdb \
  --host=127.0.0.1 \
  --port="${test_port}" \
  --username=studystarter \
  studystarter_test

npx prisma generate
DATABASE_URL="${test_database_url}" npx prisma migrate deploy
DATABASE_URL_TEST="${test_database_url}" npm run test:integration
