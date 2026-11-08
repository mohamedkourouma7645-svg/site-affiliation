import type { Cents } from "../money/money";

/**
 * Universal, data-driven configurator model. Every dish type (pizza, burger,
 * kebab, bowl, ...) is described with the same structures; no dish is
 * hard-coded. Restaurants edit these definitions from their dashboard.
 */

export type ConfiguratorKind = "pizza" | "burger" | "kebab" | "pasta" | "bowl" | "generic";

/** How ingredients of a group are placed in the 3D scene. */
export type PlacementStrategy =
  | { type: "scatter_disc"; radius: number; surfaceY: number } // toppings on a pizza
  | { type: "stack"; order: number; thickness: number } // burger layers
  | { type: "fill"; region: string } // bowl compartments, kebab filling
  | { type: "none" }; // not visualised (e.g. drinks, dips on the side)

export interface IngredientGroup {
  id: string;
  name: string;
  /** "single" = exclusive choice (radio), "multiple" = checkboxes / quantities. */
  selection: "single" | "multiple";
  /** Minimum number of distinct options to choose (0 = optional). */
  minSelect: number;
  /** Maximum number of distinct options (null = unlimited). */
  maxSelect: number | null;
  /** Maximum total units across the group (null = unlimited). */
  maxTotalQuantity: number | null;
  /** Number of chargeable units in this group that are free. */
  freeQuantity: number;
  placement: PlacementStrategy;
  sortOrder: number;
}

export interface IngredientOption {
  id: string;
  groupId: string;
  ingredientId: string;
  name: string;
  /** Price per extra unit (gross, cents). */
  unitPriceCents: Cents;
  /** Optional size-dependent price per variant id. Overrides unitPriceCents. */
  unitPriceByVariant?: Record<string, Cents>;
  /** Units included in the base price (e.g. tomato sauce on a Margherita). */
  defaultQuantity: number;
  /** Can the client remove a default ingredient? */
  removable: boolean;
  maxQuantity: number;
  available: boolean;
  allergens: string[];
  /** Key of the reusable 3D asset in ingredient_models (null = 2D only). */
  modelKey: string | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  /** Gross base price for this variant (e.g. 26 cm vs 32 cm). */
  priceCents: Cents;
  /** Scale factor applied to 3D placement (e.g. diameter ratio). */
  scale: number;
}

export type CompatibilityRule =
  | { type: "requires"; optionId: string; requiresOptionId: string }
  | { type: "excludes"; optionId: string; excludesOptionId: string };

export interface ConfigurableProduct {
  id: string;
  name: string;
  kind: ConfiguratorKind;
  available: boolean;
  variants: ProductVariant[];
  groups: IngredientGroup[];
  options: IngredientOption[];
  rules: CompatibilityRule[];
}

/** What the client sends: chosen variant + option quantities. */
export interface ProductSelection {
  variantId: string;
  /** optionId -> quantity. Options absent from the map use defaultQuantity. */
  quantities: Record<string, number>;
}

export type ValidationErrorCode =
  | "PRODUCT_UNAVAILABLE"
  | "UNKNOWN_VARIANT"
  | "UNKNOWN_OPTION"
  | "OPTION_UNAVAILABLE"
  | "INVALID_QUANTITY"
  | "QUANTITY_ABOVE_MAX"
  | "NOT_REMOVABLE"
  | "GROUP_MIN_NOT_MET"
  | "GROUP_MAX_EXCEEDED"
  | "GROUP_TOTAL_EXCEEDED"
  | "SINGLE_CHOICE_VIOLATED"
  | "RULE_REQUIRES"
  | "RULE_EXCLUDES";

export interface ValidationError {
  code: ValidationErrorCode;
  /** Id of the offending option, group or variant. */
  ref: string;
  message: string;
}
