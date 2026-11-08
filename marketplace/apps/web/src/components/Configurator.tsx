"use client";

import { useMemo, useState } from "react";
import {
  ALLERGEN_LABELS_DE, formatMoney, priceProduct, resolveQuantities, validateSelection, visibleLayers,
  type Allergen, type ConfigurableProduct, type IngredientGroup, type IngredientOption, type ProductPrice,
} from "@app/core";
import { addToCart, type CartRestaurant } from "@/lib/cart";
import { PizzaPreview } from "./PizzaPreview";

interface Props {
  product: ConfigurableProduct;
  description: string;
  productAllergens: string[];
  restaurant: CartRestaurant;
}

/** Only store deviations from the defaults, with sorted keys (stable for cart merging). */
function normalise(product: ConfigurableProduct, q: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const o of [...product.options].sort((a, b) => a.id.localeCompare(b.id))) {
    const v = q[o.id];
    if (v !== undefined && v !== o.defaultQuantity) out[o.id] = v;
  }
  return out;
}

function describe(product: ConfigurableProduct, variantName: string, q: Record<string, number>): string[] {
  const lines = [variantName];
  for (const o of product.options) {
    const v = q[o.id];
    if (v === undefined || v === o.defaultQuantity) continue;
    if (v === 0) lines.push(`ohne ${o.name}`);
    else if (o.defaultQuantity === 0) lines.push(`${v > 1 ? `${v}× ` : ""}${o.name}`);
    else lines.push(`${v}× ${o.name}`);
  }
  return lines;
}

export function Configurator({ product, description, productAllergens, restaurant }: Props) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [count, setCount] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const selection = useMemo(() => ({ variantId, quantities }), [variantId, quantities]);
  const errors = useMemo(() => validateSelection(product, selection), [product, selection]);
  const current = useMemo(() => resolveQuantities(product, selection), [product, selection]);
  const [lastPrice, setLastPrice] = useState<ProductPrice | null>(null);
  const price = useMemo(() => {
    if (errors.length) return null;
    return priceProduct(product, selection);
  }, [product, selection, errors.length]);
  if (price && price !== lastPrice) setLastPrice(price);
  const shown = price ?? lastPrice;
  const variant = product.variants.find((v) => v.id === variantId);

  const optionPrice = (o: IngredientOption) => o.unitPriceByVariant?.[variantId] ?? o.unitPriceCents;
  const groupTotal = (g: IngredientGroup) => product.options.filter((o) => o.groupId === g.id).reduce((n, o) => n + (current.get(o.id) ?? 0), 0);
  const groupKinds = (g: IngredientGroup) => product.options.filter((o) => o.groupId === g.id && (current.get(o.id) ?? 0) > 0).length;

  function set(o: IngredientOption, value: number) {
    setNotice(null);
    setQuantities((q) => ({ ...q, [o.id]: value }));
  }
  function choose(g: IngredientGroup, o: IngredientOption) {
    setNotice(null);
    setQuantities((q) => {
      const next = { ...q };
      for (const other of product.options.filter((x) => x.groupId === g.id)) next[other.id] = other.id === o.id ? 1 : 0;
      return next;
    });
  }

  const allergens = useMemo(() => {
    const s = new Set<string>(productAllergens);
    for (const o of product.options) if ((current.get(o.id) ?? 0) > 0) o.allergens.forEach((a) => s.add(a));
    return [...s].map((a) => ALLERGEN_LABELS_DE[a as Allergen] ?? a);
  }, [product, current, productAllergens]);

  const layers = visibleLayers(product, selection).map((l) => ({
    key: l.option.modelKey ?? l.option.id,
    quantity: l.quantity,
    groupOrder: product.groups.find((g) => g.id === l.option.groupId)?.sortOrder ?? 0,
  }));

  function add() {
    if (!price || !variant) return;
    const item = {
      productId: product.id, productName: product.name, variantId, variantName: variant.name,
      quantities: normalise(product, quantities), summary: describe(product, variant.name, quantities),
      unitTotalCents: price.unitTotalCents, quantity: count,
    };
    if (!addToCart(restaurant, item)) {
      if (!window.confirm("Dein Warenkorb enthält Gerichte eines anderen Restaurants. Warenkorb leeren und dieses Gericht hinzufügen?")) return;
      addToCart(restaurant, item, true);
    }
    setNotice(`${count}× ${product.name} im Warenkorb.`);
  }

  return (
    <div className="configurator">
      <div className="config-visual">
        {product.kind === "pizza" ? (
          <>
            <PizzaPreview layers={layers} scale={variant?.scale ?? 1} />
            <p className="meta center">2D-Vorschau · 3D-Ansicht folgt in Phase 5</p>
          </>
        ) : null}
      </div>

      <div className="config-panel">
        <h1 className="page-title">{product.name}</h1>
        {description && <p className="meta">{description}</p>}

        {product.variants.length > 1 && (
          <fieldset className="group">
            <legend>Größe</legend>
            {product.variants.map((v) => (
              <label key={v.id} className="option">
                <input type="radio" name="variant" checked={v.id === variantId} onChange={() => setVariantId(v.id)} />
                <span className="option-name">{v.name}</span>
                <span className="option-price">{formatMoney(v.priceCents)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {[...product.groups].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => {
          const opts = product.options.filter((o) => o.groupId === g.id);
          const total = groupTotal(g);
          const kinds = groupKinds(g);
          const hint = g.selection === "single" ? "Wähle 1" : [g.maxSelect ? `bis zu ${g.maxSelect} Sorten` : null, g.maxTotalQuantity ? `max. ${g.maxTotalQuantity} Portionen` : null, g.freeQuantity ? `${g.freeQuantity} gratis` : null].filter(Boolean).join(" · ");
          return (
            <fieldset key={g.id} className="group">
              <legend>{g.name} <span className="meta">{hint}</span></legend>
              {opts.map((o) => {
                const q = current.get(o.id) ?? 0;
                const p = optionPrice(o);
                const priceLabel = !o.available ? "ausverkauft" : o.defaultQuantity > 0 && q <= o.defaultQuantity ? "inklusive" : p > 0 ? `+${formatMoney(p)}` : "gratis";
                if (g.selection === "single") {
                  return (
                    <label key={o.id} className={`option${o.available ? "" : " disabled"}`}>
                      <input type="radio" name={g.id} checked={q > 0} disabled={!o.available} onChange={() => choose(g, o)} />
                      <span className="option-name">{o.name}</span>
                      <span className="option-price">{o.defaultQuantity > 0 ? "inklusive" : priceLabel}</span>
                    </label>
                  );
                }
                const canAdd = o.available && q < o.maxQuantity && (g.maxTotalQuantity === null || total < g.maxTotalQuantity) && (q > 0 || g.maxSelect === null || kinds < g.maxSelect);
                const canRemove = q > 0 && (o.removable || q > o.defaultQuantity);
                return (
                  <div key={o.id} className={`option${o.available ? "" : " disabled"}`}>
                    <span className="option-name">
                      {o.name}
                      {o.allergens.length > 0 && <span className="meta"> · {o.allergens.map((a) => ALLERGEN_LABELS_DE[a as Allergen] ?? a).join(", ")}</span>}
                    </span>
                    <span className="option-price">{priceLabel}</span>
                    <span className="stepper" role="group" aria-label={`Menge ${o.name}`}>
                      <button type="button" onClick={() => set(o, q - 1)} disabled={!canRemove} aria-label={`${o.name} weniger`}>−</button>
                      <output aria-live="polite">{q}</output>
                      <button type="button" onClick={() => set(o, q + 1)} disabled={!canAdd} aria-label={`${o.name} mehr`}>+</button>
                    </span>
                  </div>
                );
              })}
            </fieldset>
          );
        })}

        {errors.length > 0 && (
          <ul className="error-list" role="alert">
            {errors.map((e) => <li key={e.code + e.ref}>{e.message}</li>)}
          </ul>
        )}

        {shown && (
          <section className="price-box" aria-label="Preisübersicht">
            <div className="price-row"><span>Grundpreis ({variant?.name})</span><span>{formatMoney(shown.basePriceCents)}</span></div>
            {shown.lines.filter((l) => l.chargedQuantity + l.freeQuantity > 0).map((l) => (
              <div key={l.optionId} className="price-row meta">
                <span>{l.chargedQuantity + l.freeQuantity}× {l.name}{l.freeQuantity ? ` (${l.freeQuantity} gratis)` : ""}</span>
                <span>{formatMoney(l.totalCents)}</span>
              </div>
            ))}
            <div className="price-row"><span>Extras</span><span>{formatMoney(shown.extrasCents)}</span></div>
            <div className="price-row total"><span>Preis pro Stück</span><span data-testid="unit-price">{formatMoney(shown.unitTotalCents)}</span></div>
            <p className="meta">Alle Preise inkl. MwSt.</p>
          </section>
        )}

        {allergens.length > 0 && <p className="meta"><strong>Allergene:</strong> {allergens.join(", ")}</p>}

        <div className="add-bar">
          <span className="stepper" role="group" aria-label="Anzahl">
            <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="Anzahl verringern">−</button>
            <output aria-live="polite">{count}</output>
            <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label="Anzahl erhöhen">+</button>
          </span>
          <button type="button" className="btn btn-primary" onClick={add} disabled={!price}>
            In den Warenkorb · {shown ? formatMoney(shown.unitTotalCents * count) : "–"}
          </button>
        </div>
        {notice && <p className="status" role="status">{notice} <a href="/warenkorb">Zum Warenkorb →</a></p>}
      </div>
    </div>
  );
}
