import Link from "next/link";
import { DEFAULT_LOCALE, t } from "@app/core";
import { AddressSearch } from "@/components/AddressSearch";
import { listRootCategories } from "@/lib/catalog";

export const revalidate = 300;

export default async function HomePage() {
  const locale = DEFAULT_LOCALE;
  const categories = await listRootCategories(locale);

  return (
    <div className="container">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">{t(locale, "app.tagline")}</h1>
        <p>{t(locale, "home.configuratorText")}</p>
        <AddressSearch locale={locale} />
      </section>

      <section className="section" aria-labelledby="cat-title">
        <h2 id="cat-title">{t(locale, "home.categories")}</h2>
        <ul className="categories">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link className="category" href={`/restaurants?kategorie=${c.slug}`}>
                <span className="category-icon" aria-hidden="true">{c.icon}</span>
                <span>{c.name}</span>
                {c.hasConfigurator && <span className="badge-3d">3D</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="feature-title">
        <div className="feature">
          <h2 id="feature-title">{t(locale, "home.configuratorTitle")}</h2>
          <p>{t(locale, "home.configuratorText")}</p>
        </div>
      </section>
    </div>
  );
}
