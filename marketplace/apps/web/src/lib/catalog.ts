import "server-only";
import { ROOT_CATEGORIES, type Locale } from "@app/core";
import { z } from "zod";
import { getSupabase } from "./supabase/server";

export interface CategoryView {
  slug: string;
  name: string;
  icon: string;
  hasConfigurator: boolean;
}

/** Root categories from the database, or the bundled reference taxonomy when no DB is configured. */
export async function listRootCategories(locale: Locale): Promise<CategoryView[]> {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name, icon, configurator_kind")
      .is("restaurant_id", null)
      .is("parent_id", null)
      .eq("active", true)
      .order("sort_order");
    if (!error && data && data.length > 0) {
      return data.map((c) => ({
        slug: c.slug as string,
        name: ((c.name as Record<string, string>)[locale] ?? (c.name as Record<string, string>).de) as string,
        icon: (c.icon as string | null) ?? "🍽️",
        hasConfigurator: c.configurator_kind !== null,
      }));
    }
  }
  return ROOT_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name[locale], icon: c.emoji, hasConfigurator: c.configurator !== null }));
}

export const restaurantSearchSchema = z.object({
  adresse: z.string().trim().max(200).optional(),
  modus: z.enum(["lieferung", "abholung"]).optional(),
  kategorie: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
});
export type RestaurantSearch = z.infer<typeof restaurantSearchSchema>;

export interface RestaurantCard {
  slug: string;
  name: string;
  city: string;
  prepTimeMinutes: number;
  ratingAvg: number;
  ratingCount: number;
  offersDelivery: boolean;
  offersPickup: boolean;
}

/**
 * Lists verified, active restaurants. Distance filtering needs geocoding
 * (Phase 2); until then the result is not filtered by address.
 */
export async function searchRestaurants(search: RestaurantSearch): Promise<{ configured: boolean; restaurants: RestaurantCard[] }> {
  const supabase = await getSupabase();
  if (!supabase) return { configured: false, restaurants: [] };
  let query = supabase
    .from("restaurants")
    .select("slug, name, city, prep_time_minutes, rating_avg, rating_count, offers_delivery, offers_pickup")
    .eq("status", "active")
    .limit(50);
  if (search.modus === "lieferung") query = query.eq("offers_delivery", true);
  if (search.modus === "abholung") query = query.eq("offers_pickup", true);
  if (search.kategorie) query = query.contains("cuisines", [search.kategorie]);
  const { data, error } = await query;
  if (error) throw new Error(`Restaurant search failed: ${error.message}`);
  return {
    configured: true,
    restaurants: (data ?? []).map((r) => ({
      slug: r.slug as string,
      name: r.name as string,
      city: r.city as string,
      prepTimeMinutes: r.prep_time_minutes as number,
      ratingAvg: Number(r.rating_avg),
      ratingCount: r.rating_count as number,
      offersDelivery: r.offers_delivery as boolean,
      offersPickup: r.offers_pickup as boolean,
    })),
  };
}
