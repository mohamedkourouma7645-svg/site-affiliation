import type { ConfigurableProduct } from "../src";

/** Test fixture only – not a real restaurant product. */
export function testPizza(): ConfigurableProduct {
  const opt = (id: string, groupId: string, name: string, unitPriceCents: number, extra: Partial<ConfigurableProduct["options"][number]> = {}) => ({
    id, groupId, ingredientId: id, name, unitPriceCents, defaultQuantity: 0, removable: true,
    maxQuantity: 3, available: true, allergens: [], modelKey: `pizza/${id}`, ...extra,
  });
  return {
    id: "test-pizza", name: "Test-Pizza", kind: "pizza", available: true,
    variants: [
      { id: "26cm", name: "26 cm", priceCents: 1200, scale: 0.81 },
      { id: "32cm", name: "32 cm", priceCents: 1450, scale: 1 },
    ],
    groups: [
      { id: "dough", name: "Teig", selection: "single", minSelect: 1, maxSelect: 1, maxTotalQuantity: 1, freeQuantity: 0, placement: { type: "none" }, sortOrder: 0 },
      { id: "sauce", name: "Soße", selection: "single", minSelect: 1, maxSelect: 1, maxTotalQuantity: 1, freeQuantity: 0, placement: { type: "fill", region: "base" }, sortOrder: 1 },
      { id: "cheese", name: "Käse", selection: "multiple", minSelect: 0, maxSelect: 3, maxTotalQuantity: 4, freeQuantity: 0, placement: { type: "scatter_disc", radius: 0.14, surfaceY: 0.012 }, sortOrder: 2 },
      { id: "toppings", name: "Beläge", selection: "multiple", minSelect: 0, maxSelect: 8, maxTotalQuantity: 10, freeQuantity: 0, placement: { type: "scatter_disc", radius: 0.13, surfaceY: 0.016 }, sortOrder: 3 },
    ],
    options: [
      opt("classic", "dough", "Klassisch", 0, { defaultQuantity: 1, removable: false, maxQuantity: 1, allergens: ["gluten"] }),
      opt("wholegrain", "dough", "Vollkorn", 100, { maxQuantity: 1, allergens: ["gluten"] }),
      opt("tomato", "sauce", "Tomatensoße", 0, { defaultQuantity: 1, maxQuantity: 1 }),
      opt("bbq", "sauce", "BBQ-Soße", 50, { maxQuantity: 1, allergens: ["mustard"] }),
      opt("mozzarella", "cheese", "Mozzarella", 150, { defaultQuantity: 1, allergens: ["milk"] }),
      opt("cheddar", "cheese", "Cheddar", 150, { allergens: ["milk"] }),
      opt("salami", "toppings", "Salami", 200, { unitPriceByVariant: { "32cm": 250 } }),
      opt("mushrooms", "toppings", "Champignons", 100),
      opt("chicken", "toppings", "Hähnchen", 250),
      opt("olives", "toppings", "Oliven", 80),
      opt("pineapple", "toppings", "Ananas", 100, { available: false }),
    ],
    rules: [{ type: "excludes", optionId: "bbq", excludesOptionId: "olives" }],
  };
}
