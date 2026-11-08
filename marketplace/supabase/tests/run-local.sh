#!/usr/bin/env bash
# Applies the migration + seed to a throw-away local PostgreSQL database and
# runs the RLS/security tests. Requires a local PostgreSQL superuser.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="marketplace_test_$$"
PSQL=(psql -v ON_ERROR_STOP=1 -X -q)
cleanup() { dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT
createdb "$DB"
"${PSQL[@]}" -d "$DB" -f tests/00_supabase_stub.sql
for f in migrations/*.sql; do "${PSQL[@]}" -d "$DB" -f "$f"; done
"${PSQL[@]}" -d "$DB" -f seed.sql
"${PSQL[@]}" -d "$DB" -f seed.sql # seed must be idempotent
"${PSQL[@]}" -d "$DB" -f tests/rls.test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /' | grep -v '^\s*$'
