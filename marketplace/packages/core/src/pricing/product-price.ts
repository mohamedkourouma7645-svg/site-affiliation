import { assertCents, type Cents } from "../money/money";
import { resolveQuantities, validateSelection } from "../configurator/engine";
import type { ConfigurableProduct, IngredientOption, ProductSelection, ValidationError } from "../configurator/types";

export interface PriceLine {
  optionId: string;
  name: string;
  /** Units charged (above default and after free units). */
  chargedQuantity: number;
  /** Units given for free by the group's freeQuantity. */
  freeQuantity: number;
  unitPriceCents: Cents;
  totalCents: Cents;
}

export interface ProductPrice {
  variantId: string;
  basePriceCents: Cents;
  extrasCents: Cents;
  /** Gross price of ONE configured unit. */
  unitTotalCents: Cents;
  lines: PriceLine[];
}

export class InvalidSelectionError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "InvalidSelectionError";
  }
}

function unitPrice(option: IngredientOption, variantId: string): Cents {
  const byVariant = option.unitPriceByVariant?.[variantId];
  return assertCents(byVariant ?? option.unitPriceCents, `price of ${option.id}`);
}

/**
 * Price policy (documented in docs/ARCHITECTURE.md):
 *  - Default ingredients are included in the base price.
 *  - Units above the default quantity are charged per unit.
 *  - Removing a default ingredient does not reduce the price.
 *  - A group's `freeQuantity` units are deducted from the cheapest chargeable units.
 */
export function priceProduct(product: ConfigurableProduct, selection: ProductSelection): ProductPrice {
  const errors = validateSelection(product, selection);
  if (errors.length > 0) throw new InvalidSelectionError(errors);

  const variant = product.variants.find((v) => v.id === selection.variantId)!;
  const quantities = resolveQuantities(product, selection);
  const lines: PriceLine[] = [];

  for (const group of product.groups) {
    // Expand chargeable units so free units can be applied to the cheapest ones.
    const units: Array<{ option: IngredientOption; price: Cents }> = [];
    for (const option of product.options.filter((o) => o.groupId === group.id)) {
      const extra = Math.max(0, (quantities.get(option.id) ?? 0) - option.defaultQuantity);
      for (let i = 0; i < extra; i++) units.push({ option, price: unitPrice(option, variant.id) });
    }
    units.sort((a, b) => a.price - b.price || a.option.id.localeCompare(b.option.id));
    const freeUnits = units.slice(0, group.freeQuantity);
    const paidUnits = units.slice(group.freeQuantity);

    const byOption = new Map<string, PriceLine>();
    const line = (option: IngredientOption) => {
      let l = byOption.get(option.id);
      if (!l) {
        l = { optionId: option.id, name: option.name, chargedQuantity: 0, freeQuantity: 0, unitPriceCents: unitPrice(option, variant.id), totalCents: 0 };
        byOption.set(option.id, l);
      }
      return l;
    };
    for (const u of freeUnits) line(u.option).freeQuantity++;
    for (const u of paidUnits) {
      const l = line(u.option);
      l.chargedQuantity++;
      l.totalCents += u.price;
    }
    lines.push(...byOption.values());
  }

  const basePriceCents = assertCents(variant.priceCents, "variant price");
  const extrasCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  return { variantId: variant.id, basePriceCents, extrasCents, unitTotalCents: basePriceCents + extrasCents, lines };
}
