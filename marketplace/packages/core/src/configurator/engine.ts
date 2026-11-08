import type {
  ConfigurableProduct,
  IngredientOption,
  ProductSelection,
  ValidationError,
} from "./types";

/** Effective quantity for every option (missing entries fall back to the default). */
export function resolveQuantities(
  product: ConfigurableProduct,
  selection: ProductSelection,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const option of product.options) {
    const q = selection.quantities[option.id];
    result.set(option.id, q === undefined ? option.defaultQuantity : q);
  }
  return result;
}

/**
 * Validates a selection against the product definition.
 * This function is the single source of truth and MUST be executed on the
 * server before pricing / order creation. Browser-side validation is only UX.
 */
export function validateSelection(
  product: ConfigurableProduct,
  selection: ProductSelection,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const optionsById = new Map(product.options.map((o) => [o.id, o]));

  if (!product.available) {
    errors.push({ code: "PRODUCT_UNAVAILABLE", ref: product.id, message: "Produkt ist nicht verfügbar." });
  }
  if (!product.variants.some((v) => v.id === selection.variantId)) {
    errors.push({ code: "UNKNOWN_VARIANT", ref: selection.variantId, message: "Unbekannte Größe/Variante." });
  }

  for (const [optionId, qty] of Object.entries(selection.quantities)) {
    const option = optionsById.get(optionId);
    if (!option) {
      errors.push({ code: "UNKNOWN_OPTION", ref: optionId, message: "Unbekannte Zutat." });
      continue;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      errors.push({ code: "INVALID_QUANTITY", ref: optionId, message: "Ungültige Menge." });
      continue;
    }
    if (qty > option.maxQuantity) {
      errors.push({ code: "QUANTITY_ABOVE_MAX", ref: optionId, message: `${option.name}: maximal ${option.maxQuantity}.` });
    }
    if (qty < option.defaultQuantity && !option.removable) {
      errors.push({ code: "NOT_REMOVABLE", ref: optionId, message: `${option.name} kann nicht entfernt werden.` });
    }
    if (qty > 0 && !option.available) {
      errors.push({ code: "OPTION_UNAVAILABLE", ref: optionId, message: `${option.name} ist ausverkauft.` });
    }
  }

  const quantities = resolveQuantities(product, selection);

  // Default ingredients that became unavailable must be reported as well.
  for (const option of product.options) {
    if (selection.quantities[option.id] === undefined && option.defaultQuantity > 0 && !option.available) {
      errors.push({ code: "OPTION_UNAVAILABLE", ref: option.id, message: `${option.name} ist ausverkauft.` });
    }
  }

  for (const group of product.groups) {
    const groupOptions = product.options.filter((o) => o.groupId === group.id);
    const chosen = groupOptions.filter((o) => (quantities.get(o.id) ?? 0) > 0);
    const total = chosen.reduce((sum, o) => sum + (quantities.get(o.id) ?? 0), 0);

    if (chosen.length < group.minSelect) {
      errors.push({ code: "GROUP_MIN_NOT_MET", ref: group.id, message: `${group.name}: bitte mindestens ${group.minSelect} wählen.` });
    }
    if (group.selection === "single" && chosen.length > 1) {
      errors.push({ code: "SINGLE_CHOICE_VIOLATED", ref: group.id, message: `${group.name}: nur eine Auswahl möglich.` });
    }
    if (group.maxSelect !== null && chosen.length > group.maxSelect) {
      errors.push({ code: "GROUP_MAX_EXCEEDED", ref: group.id, message: `${group.name}: höchstens ${group.maxSelect} Sorten.` });
    }
    if (group.maxTotalQuantity !== null && total > group.maxTotalQuantity) {
      errors.push({ code: "GROUP_TOTAL_EXCEEDED", ref: group.id, message: `${group.name}: höchstens ${group.maxTotalQuantity} Portionen.` });
    }
  }

  const has = (id: string) => (quantities.get(id) ?? 0) > 0;
  const name = (id: string) => optionsById.get(id)?.name ?? id;
  for (const rule of product.rules) {
    if (rule.type === "requires" && has(rule.optionId) && !has(rule.requiresOptionId)) {
      errors.push({ code: "RULE_REQUIRES", ref: rule.optionId, message: `${name(rule.optionId)} erfordert ${name(rule.requiresOptionId)}.` });
    }
    if (rule.type === "excludes" && has(rule.optionId) && has(rule.excludesOptionId)) {
      errors.push({ code: "RULE_EXCLUDES", ref: rule.optionId, message: `${name(rule.optionId)} ist nicht mit ${name(rule.excludesOptionId)} kombinierbar.` });
    }
  }

  return errors;
}

/** Options that are present on the dish (quantity > 0), ordered for rendering. */
export function visibleLayers(
  product: ConfigurableProduct,
  selection: ProductSelection,
): Array<{ option: IngredientOption; quantity: number }> {
  const quantities = resolveQuantities(product, selection);
  const groupOrder = new Map(product.groups.map((g) => [g.id, g.sortOrder]));
  return product.options
    .filter((o) => (quantities.get(o.id) ?? 0) > 0)
    .sort((a, b) => (groupOrder.get(a.groupId) ?? 0) - (groupOrder.get(b.groupId) ?? 0))
    .map((option) => ({ option, quantity: quantities.get(option.id) ?? 0 }));
}
