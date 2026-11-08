import "server-only";
import type { ConfigurableProduct, ConfiguratorKind, Locale, PlacementStrategy } from "@app/core";
import type { I18n, ProductBundle } from "./catalog-repo";

export const tr = (v: I18n | null | undefined, locale: Locale): string => (v?.[locale] ?? v?.de ?? "").toString();

const KINDS: ConfiguratorKind[] = ["pizza", "burger", "kebab", "pasta", "bowl", "generic"];

function slugKey(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Maps database rows to the engine model used for validation, pricing and rendering. */
export function toConfigurableProduct(b: ProductBundle, locale: Locale): ConfigurableProduct {
  const ingredients = new Map(b.ingredients.map((i) => [i.id, i]));
  const pricesByPi = new Map<string, Record<string, number>>();
  for (const p of b.prices) {
    const m = pricesByPi.get(p.product_ingredient_id) ?? {};
    m[p.variant_id] = p.unit_price_cents;
    pricesByPi.set(p.product_ingredient_id, m);
  }
  const kind = (KINDS as string[]).includes(b.product.configurator_kind ?? "") ? (b.product.configurator_kind as ConfiguratorKind) : "generic";
  return {
    id: b.product.id,
    name: tr(b.product.name, locale),
    kind,
    available: b.product.available,
    variants: b.variants.filter((v) => v.available).map((v) => ({ id: v.id, name: tr(v.name, locale), priceCents: v.price_cents, scale: Number(v.scale) })),
    groups: b.groups.map((g) => ({
      id: g.id,
      name: tr(g.name, locale),
      selection: g.selection,
      minSelect: g.min_select,
      maxSelect: g.max_select,
      maxTotalQuantity: g.max_total_quantity,
      freeQuantity: g.free_quantity,
      placement: (g.placement ?? { type: "none" }) as unknown as PlacementStrategy,
      sortOrder: g.sort_order,
    })),
    options: b.productIngredients.map((pi) => {
      const ing = ingredients.get(pi.ingredient_id);
      const name = tr(ing?.name, locale);
      const byVariant = pricesByPi.get(pi.id);
      return {
        id: pi.id,
        groupId: pi.group_id,
        ingredientId: pi.ingredient_id,
        name,
        unitPriceCents: pi.unit_price_cents,
        ...(byVariant ? { unitPriceByVariant: byVariant } : {}),
        defaultQuantity: pi.default_quantity,
        removable: pi.removable,
        maxQuantity: pi.max_quantity,
        available: pi.available && (ing?.available ?? false),
        allergens: ing?.allergens ?? [],
        // Visual key for the renderer; replaced by ingredient_models.key once 3D assets exist.
        modelKey: slugKey(name),
      };
    }),
    rules: b.rules.map((r) =>
      r.rule_type === "requires"
        ? { type: "requires" as const, optionId: r.option_id, requiresOptionId: r.target_option_id }
        : { type: "excludes" as const, optionId: r.option_id, excludesOptionId: r.target_option_id },
    ),
  };
}
