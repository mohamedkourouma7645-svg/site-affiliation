import { applyBasisPoints, assertCents, vatIncludedInGross, type Cents } from "../money/money";

export interface OrderLineInput {
  /** Gross price of one configured unit (from priceProduct). */
  unitGrossCents: Cents;
  quantity: number;
  /** VAT rate in basis points configured on the product (e.g. 700 / 1900). */
  vatRateBp: number;
}

export interface OrderTotalsInput {
  lines: OrderLineInput[];
  fulfilment: "delivery" | "pickup";
  deliveryFeeCents: Cents;
  serviceFeeCents: Cents;
  /** Total discount (gross). Allocated proportionally over item lines. */
  discountCents: Cents;
  /** VAT rate applied to delivery & service fees (to be confirmed by a tax advisor). */
  feesVatRateBp: number;
  /** Platform commission on the item subtotal after discount, in basis points. */
  commissionBp: number;
  minimumOrderCents: Cents;
}

export interface OrderTotals {
  itemsSubtotalCents: Cents;
  discountCents: Cents;
  deliveryFeeCents: Cents;
  serviceFeeCents: Cents;
  totalCents: Cents;
  /** VAT included in the total, grouped by rate (bp -> cents). */
  vatByRate: Record<number, Cents>;
  commissionCents: Cents;
  /** Amount owed to the restaurant for the items (before payment provider fees). */
  restaurantShareCents: Cents;
  belowMinimumOrder: boolean;
}

/** Splits `amount` proportionally to `weights` without losing a cent (largest remainder). */
export function allocateProportionally(amount: Cents, weights: number[]): Cents[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / totalWeight);
  const floored = raw.map(Math.floor);
  let remainder = amount - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i]! += 1;
    remainder--;
  }
  return floored;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  if (input.lines.length === 0) throw new RangeError("Order needs at least one line.");
  for (const l of input.lines) {
    assertCents(l.unitGrossCents);
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99) throw new RangeError("Invalid line quantity.");
  }
  const deliveryFeeCents = input.fulfilment === "pickup" ? 0 : assertCents(input.deliveryFeeCents);
  const serviceFeeCents = assertCents(input.serviceFeeCents);

  const lineTotals = input.lines.map((l) => l.unitGrossCents * l.quantity);
  const itemsSubtotalCents = lineTotals.reduce((a, b) => a + b, 0);
  const discountCents = Math.min(assertCents(input.discountCents), itemsSubtotalCents);
  if (discountCents < 0) throw new RangeError("Discount cannot be negative.");

  const lineDiscounts = allocateProportionally(discountCents, lineTotals);
  const vatByRate: Record<number, Cents> = {};
  const grossByRate = new Map<number, Cents>();
  input.lines.forEach((l, i) => {
    const net = lineTotals[i]! - lineDiscounts[i]!;
    grossByRate.set(l.vatRateBp, (grossByRate.get(l.vatRateBp) ?? 0) + net);
  });
  const fees = deliveryFeeCents + serviceFeeCents;
  if (fees > 0) grossByRate.set(input.feesVatRateBp, (grossByRate.get(input.feesVatRateBp) ?? 0) + fees);
  for (const [rate, gross] of grossByRate) vatByRate[rate] = vatIncludedInGross(gross, rate);

  const itemsAfterDiscount = itemsSubtotalCents - discountCents;
  const commissionCents = applyBasisPoints(itemsAfterDiscount, input.commissionBp);

  return {
    itemsSubtotalCents,
    discountCents,
    deliveryFeeCents,
    serviceFeeCents,
    totalCents: itemsAfterDiscount + fees,
    vatByRate,
    commissionCents,
    restaurantShareCents: itemsAfterDiscount - commissionCents,
    belowMinimumOrder: itemsSubtotalCents < input.minimumOrderCents,
  };
}
