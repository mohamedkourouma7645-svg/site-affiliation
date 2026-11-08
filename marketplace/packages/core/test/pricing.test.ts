import { describe, expect, it } from "vitest";
import { InvalidSelectionError, allocateProportionally, computeOrderTotals, priceProduct } from "../src";
import { testPizza } from "./fixtures";

describe("product pricing", () => {
  it("reproduces the spec example (12,00 € + 1,50 + 2,00 + 1,00 + 2,50 + 0,80 = 19,80 €)", () => {
    const price = priceProduct(testPizza(), {
      variantId: "26cm",
      quantities: { mozzarella: 2, salami: 1, mushrooms: 1, chicken: 1, olives: 1 },
    });
    expect(price.basePriceCents).toBe(1200);
    expect(price.extrasCents).toBe(780);
    expect(price.unitTotalCents).toBe(1980);
  });
  it("uses size-dependent prices", () => {
    expect(priceProduct(testPizza(), { variantId: "32cm", quantities: { salami: 2 } }).unitTotalCents).toBe(1450 + 500);
  });
  it("does not refund removed default ingredients", () => {
    expect(priceProduct(testPizza(), { variantId: "26cm", quantities: { mozzarella: 0 } }).unitTotalCents).toBe(1200);
  });
  it("charges exclusive upgrades", () => {
    expect(priceProduct(testPizza(), { variantId: "26cm", quantities: { classic: 1, tomato: 0, bbq: 1 } }).extrasCents).toBe(50);
  });
  it("gives free units on the cheapest chargeable items", () => {
    const p = testPizza();
    p.groups.find((g) => g.id === "toppings")!.freeQuantity = 1;
    const price = priceProduct(p, { variantId: "26cm", quantities: { chicken: 1, olives: 1 } });
    expect(price.extrasCents).toBe(250);
    expect(price.lines.find((l) => l.optionId === "olives")).toMatchObject({ freeQuantity: 1, chargedQuantity: 0, totalCents: 0 });
  });
  it("refuses to price an invalid selection", () => {
    expect(() => priceProduct(testPizza(), { variantId: "26cm", quantities: { pineapple: 1 } })).toThrow(InvalidSelectionError);
  });
});

describe("order totals", () => {
  const base = { fulfilment: "delivery" as const, deliveryFeeCents: 199, serviceFeeCents: 99, discountCents: 0, feesVatRateBp: 1900, commissionBp: 1500, minimumOrderCents: 1000 };

  it("sums items and announced fees only", () => {
    const totals = computeOrderTotals({ ...base, lines: [{ unitGrossCents: 1780, quantity: 2, vatRateBp: 700 }] });
    expect(totals.itemsSubtotalCents).toBe(3560);
    expect(totals.totalCents).toBe(3560 + 199 + 99);
    expect(totals.commissionCents).toBe(534);
    expect(totals.restaurantShareCents).toBe(3026);
    expect(totals.vatByRate).toEqual({ 700: 233, 1900: 48 });
  });
  it("drops the delivery fee for pickup", () => {
    const totals = computeOrderTotals({ ...base, fulfilment: "pickup", lines: [{ unitGrossCents: 1000, quantity: 1, vatRateBp: 700 }] });
    expect(totals.deliveryFeeCents).toBe(0);
    expect(totals.totalCents).toBe(1099);
  });
  it("allocates discounts without losing cents and caps them", () => {
    expect(allocateProportionally(100, [1, 1, 1])).toEqual([34, 33, 33]);
    const totals = computeOrderTotals({ ...base, discountCents: 5000, lines: [{ unitGrossCents: 800, quantity: 1, vatRateBp: 700 }] });
    expect(totals.discountCents).toBe(800);
    expect(totals.totalCents).toBe(298);
  });
  it("flags orders below the minimum", () => {
    expect(computeOrderTotals({ ...base, lines: [{ unitGrossCents: 500, quantity: 1, vatRateBp: 700 }] }).belowMinimumOrder).toBe(true);
  });
  it("rejects invalid quantities", () => {
    expect(() => computeOrderTotals({ ...base, lines: [{ unitGrossCents: 500, quantity: 0, vatRateBp: 700 }] })).toThrow();
  });
});
