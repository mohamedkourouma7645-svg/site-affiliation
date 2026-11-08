"use server";

import { z } from "zod";
import { DEFAULT_LOCALE, InvalidSelectionError, computeOrderTotals, priceProduct, type OrderTotals } from "@app/core";
import { getCatalogRepo } from "@/lib/catalog-repo";
import { toConfigurableProduct } from "@/lib/menu";

const uuid = z.string().uuid();
const schema = z.object({
  restaurantId: uuid,
  fulfilment: z.enum(["delivery", "pickup"]),
  items: z
    .array(
      z.object({
        lineId: z.string().max(64),
        productId: uuid,
        variantId: uuid,
        quantities: z.record(uuid, z.number().int().min(0).max(20)),
        quantity: z.number().int().min(1).max(99),
        unitTotalCents: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(50),
});

export type CheckResult =
  | { ok: true; totals: OrderTotals; lines: { lineId: string; unitTotalCents: number; changed: boolean }[]; testMode: boolean }
  | { ok: false; error: string; lineErrors?: Record<string, string> };

/** Platform default until admin-configurable commission is read with server credentials (Phase 8). */
const DEFAULT_COMMISSION_BP = 1500;
const FEES_VAT_BP = 1900;

/**
 * Re-validates and re-prices the basket on the server from the database.
 * Browser prices are never trusted. In this phase nothing is stored and
 * nothing is charged: order creation + payment follow in Phases 7/8.
 */
export async function checkCart(input: unknown): Promise<CheckResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültiger Warenkorb." };
  const { restaurantId, fulfilment, items } = parsed.data;

  const repo = await getCatalogRepo();
  if (!repo) return { ok: false, error: "Die Datenbank ist noch nicht verbunden." };
  const restaurant = await repo.getRestaurantById(restaurantId);
  if (!restaurant) return { ok: false, error: "Restaurant nicht verfügbar." };
  if (!restaurant.accepting_orders) return { ok: false, error: "Das Restaurant nimmt gerade keine Bestellungen an." };
  if (fulfilment === "delivery" && !restaurant.offers_delivery) return { ok: false, error: "Lieferung wird nicht angeboten." };
  if (fulfilment === "pickup" && !restaurant.offers_pickup) return { ok: false, error: "Abholung wird nicht angeboten." };

  const lineErrors: Record<string, string> = {};
  const priced: { lineId: string; unitTotalCents: number; changed: boolean; quantity: number; vat: number }[] = [];
  for (const item of items) {
    const bundle = await repo.getProductBundle(item.productId);
    if (!bundle || bundle.product.restaurant_id !== restaurantId) {
      lineErrors[item.lineId] = "Gericht nicht mehr verfügbar.";
      continue;
    }
    try {
      const price = priceProduct(toConfigurableProduct(bundle, DEFAULT_LOCALE), { variantId: item.variantId, quantities: item.quantities });
      priced.push({ lineId: item.lineId, unitTotalCents: price.unitTotalCents, changed: price.unitTotalCents !== item.unitTotalCents, quantity: item.quantity, vat: bundle.product.vat_rate_bp });
    } catch (e) {
      lineErrors[item.lineId] = e instanceof InvalidSelectionError ? e.message : "Konfiguration ungültig.";
    }
  }
  if (Object.keys(lineErrors).length) return { ok: false, error: "Einige Gerichte müssen angepasst werden.", lineErrors };

  const zones = await repo.listDeliveryZones(restaurantId);
  // Address-based zone matching needs geocoding (next step); until then the cheapest active zone applies.
  const zone = zones.sort((a, b) => a.delivery_fee_cents - b.delivery_fee_cents)[0];
  if (fulfilment === "delivery" && !zone) return { ok: false, error: "Keine Lieferzone hinterlegt." };

  const totals = computeOrderTotals({
    lines: priced.map((p) => ({ unitGrossCents: p.unitTotalCents, quantity: p.quantity, vatRateBp: p.vat })),
    fulfilment,
    deliveryFeeCents: zone?.delivery_fee_cents ?? 0,
    serviceFeeCents: 0,
    discountCents: 0,
    feesVatRateBp: FEES_VAT_BP,
    commissionBp: DEFAULT_COMMISSION_BP,
    minimumOrderCents: fulfilment === "delivery" ? zone?.min_order_cents ?? 0 : 0,
  });
  return { ok: true, totals, lines: priced.map(({ lineId, unitTotalCents, changed }) => ({ lineId, unitTotalCents, changed })), testMode: restaurant.slug.startsWith("test-") };
}
