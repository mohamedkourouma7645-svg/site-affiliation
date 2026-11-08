import "server-only";
import { readFileSync } from "node:fs";
import { getSupabase } from "./supabase/server";

/** Raw database rows (column names as in PostgreSQL). Read-only, subject to RLS. */
export type I18n = Record<string, string>;
export interface RestaurantRow { id: string; slug: string; name: string; description: I18n; cuisines: string[]; status: string; city: string; prep_time_minutes: number; rating_avg: number | string; rating_count: number; offers_delivery: boolean; offers_pickup: boolean; accepting_orders: boolean; }
export interface DeliveryZoneRow { id: string; restaurant_id: string; delivery_fee_cents: number; min_order_cents: number; eta_minutes: number; active: boolean; }
export interface CategoryRow { id: string; restaurant_id: string | null; slug: string; name: I18n; sort_order: number; active: boolean; }
export interface ProductRow { id: string; restaurant_id: string; category_id: string | null; name: I18n; description: I18n; image_url: string | null; configurator_kind: string | null; is_configurable: boolean; vat_rate_bp: number; allergens: string[]; available: boolean; sort_order: number; deleted_at: string | null; }
export interface VariantRow { id: string; product_id: string; name: I18n; price_cents: number; scale: number | string; available: boolean; sort_order: number; }
export interface GroupRow { id: string; product_id: string; name: I18n; selection: "single" | "multiple"; min_select: number; max_select: number | null; max_total_quantity: number | null; free_quantity: number; placement: Record<string, unknown>; sort_order: number; }
export interface ProductIngredientRow { id: string; product_id: string; group_id: string; ingredient_id: string; unit_price_cents: number; default_quantity: number; max_quantity: number; removable: boolean; available: boolean; sort_order: number; }
export interface IngredientRow { id: string; name: I18n; allergens: string[]; available: boolean; model_id: string | null; }
export interface IngredientPriceRow { product_ingredient_id: string; variant_id: string; unit_price_cents: number; }
export interface RuleRow { id: string; product_id: string; rule_type: "requires" | "excludes"; option_id: string; target_option_id: string; }

export interface ProductBundle {
  product: ProductRow;
  variants: VariantRow[];
  groups: GroupRow[];
  productIngredients: ProductIngredientRow[];
  ingredients: IngredientRow[];
  prices: IngredientPriceRow[];
  rules: RuleRow[];
}

export interface CatalogRepo {
  listActiveRestaurants(filter: { delivery?: boolean; pickup?: boolean; cuisine?: string }): Promise<RestaurantRow[]>;
  getRestaurant(slug: string): Promise<RestaurantRow | null>;
  getRestaurantById(id: string): Promise<RestaurantRow | null>;
  listCategories(restaurantId: string): Promise<CategoryRow[]>;
  listProducts(restaurantId: string): Promise<ProductRow[]>;
  listVariants(productIds: string[]): Promise<VariantRow[]>;
  listDeliveryZones(restaurantId: string): Promise<DeliveryZoneRow[]>;
  getProductBundle(productId: string): Promise<ProductBundle | null>;
}

const RESTAURANT_COLS = "id, slug, name, description, cuisines, status, city, prep_time_minutes, rating_avg, rating_count, offers_delivery, offers_pickup, accepting_orders";

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/** Production implementation: Supabase (PostgREST) with the visitor's session. */
function supabaseRepo(sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>): CatalogRepo {
  return {
    async listActiveRestaurants(f) {
      let q = sb.from("restaurants").select(RESTAURANT_COLS).eq("status", "active").limit(50);
      if (f.delivery) q = q.eq("offers_delivery", true);
      if (f.pickup) q = q.eq("offers_pickup", true);
      if (f.cuisine) q = q.contains("cuisines", [f.cuisine]);
      return must(await q, "restaurants") as RestaurantRow[];
    },
    async getRestaurant(slug) {
      return must(await sb.from("restaurants").select(RESTAURANT_COLS).eq("slug", slug).eq("status", "active").maybeSingle(), "restaurant") as RestaurantRow | null;
    },
    async getRestaurantById(id) {
      return must(await sb.from("restaurants").select(RESTAURANT_COLS).eq("id", id).eq("status", "active").maybeSingle(), "restaurant") as RestaurantRow | null;
    },
    async listCategories(rid) {
      return must(await sb.from("categories").select("*").eq("restaurant_id", rid).eq("active", true).order("sort_order"), "categories") as CategoryRow[];
    },
    async listProducts(rid) {
      return must(await sb.from("products").select("*").eq("restaurant_id", rid).is("deleted_at", null).order("sort_order"), "products") as ProductRow[];
    },
    async listVariants(ids) {
      if (ids.length === 0) return [];
      return must(await sb.from("product_variants").select("*").in("product_id", ids).order("sort_order"), "variants") as VariantRow[];
    },
    async listDeliveryZones(rid) {
      return must(await sb.from("delivery_zones").select("*").eq("restaurant_id", rid).eq("active", true), "zones") as DeliveryZoneRow[];
    },
    async getProductBundle(pid) {
      const product = must(await sb.from("products").select("*").eq("id", pid).is("deleted_at", null).maybeSingle(), "product") as ProductRow | null;
      if (!product) return null;
      const [variants, groups, pis, rules] = await Promise.all([
        sb.from("product_variants").select("*").eq("product_id", pid).order("sort_order"),
        sb.from("ingredient_groups").select("*").eq("product_id", pid).order("sort_order"),
        sb.from("product_ingredients").select("*").eq("product_id", pid).order("sort_order"),
        sb.from("configurator_rules").select("*").eq("product_id", pid),
      ]);
      const productIngredients = must(pis, "product_ingredients") as ProductIngredientRow[];
      const piIds = productIngredients.map((p) => p.id);
      const ingIds = [...new Set(productIngredients.map((p) => p.ingredient_id))];
      const [ingredients, prices] = await Promise.all([
        ingIds.length ? sb.from("ingredients").select("id, name, allergens, available, model_id").in("id", ingIds) : Promise.resolve({ data: [], error: null }),
        piIds.length ? sb.from("product_ingredient_prices").select("*").in("product_ingredient_id", piIds) : Promise.resolve({ data: [], error: null }),
      ]);
      return {
        product,
        variants: must(variants, "variants") as VariantRow[],
        groups: must(groups, "groups") as GroupRow[],
        productIngredients,
        ingredients: must(ingredients, "ingredients") as IngredientRow[],
        prices: must(prices, "prices") as IngredientPriceRow[],
        rules: must(rules, "rules") as RuleRow[],
      };
    },
  };
}

export interface CatalogFixture {
  restaurants: RestaurantRow[]; delivery_zones: DeliveryZoneRow[]; categories: CategoryRow[]; products: ProductRow[];
  product_variants: VariantRow[]; ingredient_groups: GroupRow[]; product_ingredients: ProductIngredientRow[];
  ingredients: IngredientRow[]; product_ingredient_prices: IngredientPriceRow[]; configurator_rules: RuleRow[];
}

/**
 * Test implementation backed by a JSON dump of the real schema + demo data,
 * exported from PostgreSQL as the `anon` role (so RLS was applied).
 * Only used when CATALOG_FIXTURE is set (automated tests). Never in production.
 */
export function fixtureRepo(fx: CatalogFixture): CatalogRepo {
  const active = (r: RestaurantRow) => r.status === "active";
  const sortBy = <T extends { sort_order: number }>(a: T[]) => [...a].sort((x, y) => x.sort_order - y.sort_order);
  return {
    async listActiveRestaurants(f) {
      return fx.restaurants.filter((r) => active(r) && (!f.delivery || r.offers_delivery) && (!f.pickup || r.offers_pickup) && (!f.cuisine || r.cuisines.includes(f.cuisine)));
    },
    async getRestaurant(slug) { return fx.restaurants.find((r) => r.slug === slug && active(r)) ?? null; },
    async getRestaurantById(id) { return fx.restaurants.find((r) => r.id === id && active(r)) ?? null; },
    async listCategories(rid) { return sortBy(fx.categories.filter((c) => c.restaurant_id === rid && c.active)); },
    async listProducts(rid) { return sortBy(fx.products.filter((p) => p.restaurant_id === rid && !p.deleted_at)); },
    async listVariants(ids) { return sortBy(fx.product_variants.filter((v) => ids.includes(v.product_id))); },
    async listDeliveryZones(rid) { return fx.delivery_zones.filter((z) => z.restaurant_id === rid && z.active); },
    async getProductBundle(pid) {
      const product = fx.products.find((p) => p.id === pid && !p.deleted_at);
      if (!product) return null;
      const productIngredients = sortBy(fx.product_ingredients.filter((p) => p.product_id === pid));
      const piIds = new Set(productIngredients.map((p) => p.id));
      const ingIds = new Set(productIngredients.map((p) => p.ingredient_id));
      return {
        product,
        variants: sortBy(fx.product_variants.filter((v) => v.product_id === pid)),
        groups: sortBy(fx.ingredient_groups.filter((g) => g.product_id === pid)),
        productIngredients,
        ingredients: fx.ingredients.filter((i) => ingIds.has(i.id)),
        prices: fx.product_ingredient_prices.filter((p) => piIds.has(p.product_ingredient_id)),
        rules: fx.configurator_rules.filter((r) => r.product_id === pid),
      };
    },
  };
}

let fixtureCache: CatalogRepo | null = null;

/** Returns the catalogue source, or null when no database is configured. */
export async function getCatalogRepo(): Promise<CatalogRepo | null> {
  const fixturePath = process.env.CATALOG_FIXTURE;
  if (fixturePath && (process.env.NODE_ENV !== "production" || process.env.ALLOW_CATALOG_FIXTURE === "1")) {
    fixtureCache ??= fixtureRepo(JSON.parse(readFileSync(fixturePath!, "utf8")) as CatalogFixture);
    return fixtureCache;
  }
  const sb = await getSupabase();
  return sb ? supabaseRepo(sb) : null;
}
