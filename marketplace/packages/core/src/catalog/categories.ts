/**
 * Initial category taxonomy (reference data, NOT restaurants or products).
 * It is seeded into the `categories` table (supabase/seed.sql). Restaurants and
 * admins can add more categories at runtime without code changes.
 */
export interface CategoryRef {
  slug: string;
  name: { de: string; en: string; fr: string };
  /** Configurator template that suits this category, if any. */
  configurator: "pizza" | "burger" | "kebab" | "pasta" | "bowl" | null;
  emoji: string;
}

export const ROOT_CATEGORIES: CategoryRef[] = [
  { slug: "pizza", name: { de: "Pizza", en: "Pizza", fr: "Pizzas" }, configurator: "pizza", emoji: "🍕" },
  { slug: "burger", name: { de: "Burger", en: "Burgers", fr: "Burgers" }, configurator: "burger", emoji: "🍔" },
  { slug: "doener-kebab", name: { de: "Döner & Türkisch", en: "Kebab & Turkish", fr: "Kebabs & turc" }, configurator: "kebab", emoji: "🥙" },
  { slug: "sandwiches-wraps", name: { de: "Sandwiches & Wraps", en: "Sandwiches & wraps", fr: "Sandwichs & wraps" }, configurator: null, emoji: "🥪" },
  { slug: "pasta", name: { de: "Pasta", en: "Pasta", fr: "Pâtes" }, configurator: "pasta", emoji: "🍝" },
  { slug: "sushi", name: { de: "Sushi & Japanisch", en: "Sushi & Japanese", fr: "Sushis & japonais" }, configurator: null, emoji: "🍣" },
  { slug: "bowls-salate", name: { de: "Bowls & Salate", en: "Bowls & salads", fr: "Bowls & salades" }, configurator: "bowl", emoji: "🥗" },
  { slug: "chicken", name: { de: "Chicken", en: "Chicken", fr: "Poulet" }, configurator: null, emoji: "🍗" },
  { slug: "tacos-burritos", name: { de: "Tacos & Burritos", en: "Tacos & burritos", fr: "Tacos & burritos" }, configurator: null, emoji: "🌮" },
  { slug: "pommes-snacks", name: { de: "Pommes & Snacks", en: "Fries & snacks", fr: "Frites & snacks" }, configurator: null, emoji: "🍟" },
  { slug: "indisch", name: { de: "Indisch", en: "Indian", fr: "Indien" }, configurator: null, emoji: "🍛" },
  { slug: "chinesisch", name: { de: "Chinesisch", en: "Chinese", fr: "Chinois" }, configurator: null, emoji: "🥡" },
  { slug: "thai", name: { de: "Thailändisch", en: "Thai", fr: "Thaïlandais" }, configurator: null, emoji: "🍜" },
  { slug: "italienisch", name: { de: "Italienisch", en: "Italian", fr: "Italien" }, configurator: null, emoji: "🇮🇹" },
  { slug: "afrikanisch", name: { de: "Afrikanisch", en: "African", fr: "Africain" }, configurator: null, emoji: "🍲" },
  { slug: "traditionell", name: { de: "Hausmannskost", en: "Traditional", fr: "Plats traditionnels" }, configurator: null, emoji: "🥘" },
  { slug: "desserts", name: { de: "Desserts", en: "Desserts", fr: "Desserts" }, configurator: null, emoji: "🍰" },
  { slug: "eis", name: { de: "Eis", en: "Ice cream", fr: "Glaces" }, configurator: null, emoji: "🍨" },
  { slug: "crepes-waffeln", name: { de: "Crêpes & Waffeln", en: "Crêpes & waffles", fr: "Crêpes & gaufres" }, configurator: null, emoji: "🧇" },
  { slug: "baeckerei", name: { de: "Bäckerei & Konditorei", en: "Bakery & pastry", fr: "Boulangerie & pâtisserie" }, configurator: null, emoji: "🥐" },
  { slug: "getraenke", name: { de: "Getränke", en: "Drinks", fr: "Boissons" }, configurator: null, emoji: "🥤" },
  { slug: "kindermenues", name: { de: "Kindermenüs", en: "Kids' menus", fr: "Menus enfants" }, configurator: null, emoji: "🧒" },
];

/**
 * The 14 allergens that must be declared in the EU (Regulation (EU) No 1169/2011,
 * Annex II; in Germany LMIV / LMIDV). Keys are stable identifiers stored in the DB.
 */
export const EU_ALLERGENS = [
  "gluten", "crustaceans", "eggs", "fish", "peanuts", "soy", "milk",
  "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
] as const;
export type Allergen = (typeof EU_ALLERGENS)[number];

/** German display labels for the 14 EU allergens. */
export const ALLERGEN_LABELS_DE: Record<Allergen, string> = {
  gluten: "Glutenhaltiges Getreide", crustaceans: "Krebstiere", eggs: "Eier", fish: "Fisch", peanuts: "Erdnüsse",
  soy: "Soja", milk: "Milch/Laktose", nuts: "Schalenfrüchte", celery: "Sellerie", mustard: "Senf", sesame: "Sesam",
  sulphites: "Schwefeldioxid/Sulfite", lupin: "Lupinen", molluscs: "Weichtiere",
};
