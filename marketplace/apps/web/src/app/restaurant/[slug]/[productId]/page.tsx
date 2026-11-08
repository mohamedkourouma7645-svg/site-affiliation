import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@app/core";
import { getCatalogRepo } from "@/lib/catalog-repo";
import { toConfigurableProduct, tr } from "@/lib/menu";
import { Configurator } from "@/components/Configurator";
import { TestModeBanner } from "@/components/TestModeBanner";

type Props = { params: Promise<{ slug: string; productId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gericht anpassen" };

export default async function ProductPage({ params }: Props) {
  const locale = DEFAULT_LOCALE;
  const { slug, productId } = await params;
  const repo = await getCatalogRepo();
  if (!repo || !UUID.test(productId)) notFound();
  const restaurant = await repo.getRestaurant(slug);
  const bundle = restaurant ? await repo.getProductBundle(productId) : null;
  if (!restaurant || !bundle || bundle.product.restaurant_id !== restaurant.id) notFound();

  const product = toConfigurableProduct(bundle, locale);
  return (
    <div className="container section">
      {restaurant.slug.startsWith("test-") && <TestModeBanner />}
      <p className="meta">
        <Link href={`/restaurant/${restaurant.slug}`}>← {restaurant.name}</Link>
      </p>
      <Configurator
        product={product}
        description={tr(bundle.product.description, locale)}
        productAllergens={bundle.product.allergens}
        restaurant={{ id: restaurant.id, slug: restaurant.slug, name: restaurant.name }}
      />
    </div>
  );
}
