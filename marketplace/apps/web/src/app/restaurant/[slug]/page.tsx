import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, formatMoney } from "@app/core";
import { getCatalogRepo } from "@/lib/catalog-repo";
import { tr } from "@/lib/menu";
import { TestModeBanner } from "@/components/TestModeBanner";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getCatalogRepo();
  const r = repo ? await repo.getRestaurant(slug) : null;
  return { title: r?.name ?? "Restaurant" };
}

export default async function RestaurantPage({ params }: Props) {
  const locale = DEFAULT_LOCALE;
  const { slug } = await params;
  const repo = await getCatalogRepo();
  if (!repo || !/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const restaurant = await repo.getRestaurant(slug);
  if (!restaurant) notFound();

  const [categories, products, zones] = await Promise.all([
    repo.listCategories(restaurant.id),
    repo.listProducts(restaurant.id),
    repo.listDeliveryZones(restaurant.id),
  ]);
  const variants = await repo.listVariants(products.map((p) => p.id));
  const fromPrice = (pid: string) => Math.min(...variants.filter((v) => v.product_id === pid && v.available).map((v) => v.price_cents));
  const fee = zones.length ? Math.min(...zones.map((z) => z.delivery_fee_cents)) : null;
  const minOrder = zones.length ? Math.min(...zones.map((z) => z.min_order_cents)) : null;
  const sections = [
    ...categories.map((c) => ({ id: c.id, title: tr(c.name, locale), items: products.filter((p) => p.category_id === c.id) })),
    { id: "other", title: "Weitere", items: products.filter((p) => !categories.some((c) => c.id === p.category_id)) },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="container section">
      {restaurant.slug.startsWith("test-") && <TestModeBanner />}
      <h1 className="page-title">{restaurant.name}</h1>
      <p className="meta">
        {restaurant.city} · ca. {restaurant.prep_time_minutes} Min. Zubereitung
        {fee !== null && ` · Liefergebühr ${formatMoney(fee)}`}
        {minOrder !== null && minOrder > 0 && ` · Mindestbestellwert ${formatMoney(minOrder)}`}
      </p>
      {tr(restaurant.description, locale) && <p>{tr(restaurant.description, locale)}</p>}

      {sections.map((s) => (
        <section key={s.id} className="section" aria-labelledby={`sec-${s.id}`}>
          <h2 id={`sec-${s.id}`}>{s.title}</h2>
          <ul className="menu-list">
            {s.items.map((p) => (
              <li key={p.id}>
                <Link href={`/restaurant/${restaurant.slug}/${p.id}`} className="menu-item" aria-disabled={!p.available}>
                  <span>
                    <strong>{tr(p.name, locale)}</strong>
                    {p.is_configurable && <span className="badge-3d">Anpassbar</span>}
                    <span className="meta block">{tr(p.description, locale)}</span>
                  </span>
                  <span className="price">{Number.isFinite(fromPrice(p.id)) ? `ab ${formatMoney(fromPrice(p.id))}` : "–"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
