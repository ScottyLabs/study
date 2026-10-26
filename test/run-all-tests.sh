#!/usr/bin/env bash

set -uo pipefail

unit_status=0
integration_status=0
integration_ran=true
unit_log="$(mktemp)"
integration_log="$(mktemp)"

cleanup() {
  rm -f "$unit_log" "$integration_log"
}

trap cleanup EXIT

test_count() {
  local log_file="$1"
  local summary
  summary="$(grep -E 'Tests +[0-9]+ passed \([0-9]+\)' "$log_file" | tail -n 1 || true)"

  if [[ "$summary" =~ Tests[[:space:]]+([0-9]+)[[:space:]]+passed[[:space:]]+\(([0-9]+)\) ]]; then
    printf '%s/%s' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
  else
    printf 'unknown'
  fi
}

npm run test:unit -- "$@" 2>&1 | tee "$unit_log"
unit_status=${PIPESTATUS[0]}

if [ "$unit_status" -eq 0 ]; then
  npm run test:integration -- "$@" 2>&1 | tee "$integration_log"
  integration_status=${PIPESTATUS[0]}
else
  integration_ran=false
fi

echo
echo "========== Test suite summary =========="
if [ "$unit_status" -eq 0 ]; then
  echo "Unit tests:        PASSED ($(test_count "$unit_log"))"
else
  echo "Unit tests:        FAILED (exit $unit_status)"
fi

if [ "$integration_ran" = false ]; then
  echo "Integration tests: SKIPPED (unit tests failed)"
elif [ "$integration_status" -eq 0 ]; then
  echo "Integration tests: PASSED ($(test_count "$integration_log"))"
else
  echo "Integration tests: FAILED (exit $integration_status)"
fi
echo "========================================"

if [ "$unit_status" -ne 0 ] || [ "$integration_status" -ne 0 ]; then
  exit 1
fi
