#!/usr/bin/env bash
# Builds a throw-away DB (migration + seed + demo restaurant) and exports the
# catalogue as the `anon` role (RLS applied) to a JSON fixture used by the
# web app's automated browser tests (CATALOG_FIXTURE).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-../apps/web/e2e/fixtures/catalog.json}"
DB="marketplace_fixture_$$"
P=(psql -v ON_ERROR_STOP=1 -X -q -d "$DB")
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
createdb "$DB"
"${P[@]}" -f tests/00_supabase_stub.sql
for f in migrations/*.sql; do "${P[@]}" -f "$f"; done
"${P[@]}" -f seed.sql
"${P[@]}" -f demo/test_restaurant.sql
mkdir -p "$(dirname "$OUT")"
"${P[@]}" -t -A -c "set role anon; select json_build_object(
  'restaurants', (select coalesce(json_agg(t), '[]') from restaurants t),
  'delivery_zones', (select coalesce(json_agg(t), '[]') from delivery_zones t),
  'categories', (select coalesce(json_agg(t), '[]') from categories t where restaurant_id is not null),
  'products', (select coalesce(json_agg(t), '[]') from products t),
  'product_variants', (select coalesce(json_agg(t), '[]') from product_variants t),
  'ingredient_groups', (select coalesce(json_agg(t), '[]') from ingredient_groups t),
  'product_ingredients', (select coalesce(json_agg(t), '[]') from product_ingredients t),
  'ingredients', (select coalesce(json_agg(t), '[]') from ingredients t),
  'product_ingredient_prices', (select coalesce(json_agg(t), '[]') from product_ingredient_prices t),
  'configurator_rules', (select coalesce(json_agg(t), '[]') from configurator_rules t)
)" > "$OUT"
echo "fixture written to $OUT"
