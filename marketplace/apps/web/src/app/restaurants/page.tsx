import type { Metadata } from "next";
import { DEFAULT_LOCALE, ROOT_CATEGORIES, t } from "@app/core";
import { restaurantSearchSchema, searchRestaurants } from "@/lib/catalog";

export const metadata: Metadata = { title: "Restaurants" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RestaurantsPage({ searchParams }: Props) {
  const locale = DEFAULT_LOCALE;
  const raw = await searchParams;
  const parsed = restaurantSearchSchema.safeParse({
    adresse: typeof raw.adresse === "string" ? raw.adresse : undefined,
    modus: typeof raw.modus === "string" ? raw.modus : undefined,
    kategorie: typeof raw.kategorie === "string" ? raw.kategorie : undefined,
  });
  const search = parsed.success ? parsed.data : {};
  const { restaurants } = await searchRestaurants(search);
  const category = ROOT_CATEGORIES.find((c) => c.slug === search.kategorie);

  return (
    <div className="container section">
      <h1>{category ? `${category.emoji} ${category.name[locale]}` : "Restaurants"}</h1>
      {search.adresse && <p className="meta">{t(locale, "home.searchingFor", { address: search.adresse })}</p>}

      {restaurants.length === 0 ? (
        <div className="empty" role="status">
          <h2>{t(locale, "home.noRestaurants")}</h2>
          <p>{t(locale, "home.noRestaurantsHint")}</p>
        </div>
      ) : (
        <ul className="restaurant-list">
          {restaurants.map((r) => (
            <li key={r.slug} className="restaurant">
              <h3>{r.name}</h3>
              <p className="meta">
                {r.city} · ca. {r.prepTimeMinutes} Min.
                {r.ratingCount > 0 && ` · ★ ${r.ratingAvg.toFixed(1)} (${r.ratingCount})`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
