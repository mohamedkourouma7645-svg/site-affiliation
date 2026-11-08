"use client";

import { useMemo, useState } from "react";
import {
  ALLERGEN_LABELS_DE, formatMoney, priceProduct, resolveQuantities, validateSelection, visibleLayers,
  type Allergen, type ConfigurableProduct, type IngredientGroup, type IngredientOption, type ProductPrice,
} from "@app/core";
import { addToCart, type CartRestaurant } from "@/lib/cart";
import { PizzaPreview } from "./PizzaPreview";
import { DishViewer } from "./dish3d/DishViewer";
import { IngredientIcon } from "./IngredientIcon";

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
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

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
    const before = current.get(o.id) ?? 0;
    if (value > before) {
      const p = optionPrice(o);
      const free = value <= o.defaultQuantity;
      setToast({ id: Date.now(), text: `${o.name} ${free || p === 0 ? "inklusive" : `+${formatMoney(p)}`}` });
    }
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

  const isSauce = (g: IngredientGroup) => /so(ß|ss)e|sauce|dip/i.test(g.name);
  const groupsOrdered = [...product.groups].sort((a, b) => Number(isSauce(a)) - Number(isSauce(b)) || a.sortOrder - b.sortOrder);
  const extrasCents = shown?.extrasCents ?? 0;
  const chosenSummary = product.options.filter((o) => (current.get(o.id) ?? 0) > 0).map((o) => ((current.get(o.id) ?? 0) > 1 ? `${current.get(o.id)}× ${o.name}` : o.name));
  const word = product.kind === "pizza" ? "Pizza" : product.kind === "burger" ? "Burger" : product.name;

  return (
    <div className="configurator">
      <header className="config-head">
        <h1 className="page-title config-title">
          {product.kind === "pizza" ? "Stell deine " : product.kind === "burger" ? "Bau deinen " : ""}<em>{word}</em>
          {product.kind === "pizza" || product.kind === "burger" ? " zusammen" : ""}
        </h1>
        <p className="meta center">{product.name}{description ? ` · ${description}` : ""}</p>
        {product.variants.length > 1 && (
          <fieldset className="segmented center-block">
            <legend className="sr-only">Größe</legend>
            {product.variants.map((v) => (
              <label key={v.id}>
                <input type="radio" name="variant" checked={v.id === variantId} onChange={() => setVariantId(v.id)} />
                <span>{v.name}</span>
              </label>
            ))}
          </fieldset>
        )}
      </header>

      <div className="config-visual">
        {product.kind === "pizza" || product.kind === "burger" ? (
          <>
            <DishViewer
              kind={product.kind}
              layers={layers}
              scale={variant?.scale ?? 1}
              fallback={product.kind === "pizza" ? <PizzaPreview layers={layers} scale={variant?.scale ?? 1} /> : <ol className="stack-fallback" aria-label="Aufbau deines Burgers">{[...layers].reverse().map((l) => <li key={l.key}>{l.quantity > 1 ? `${l.quantity}× ` : ""}{product.options.find((o) => o.modelKey === l.key)?.name}</li>)}</ol>}
            />
            {toast && <div key={toast.id} className="toast" role="status">{toast.text}</div>}
          </>
        ) : null}
        <p className="summary-line">{chosenSummary.join(" · ")}</p>
        <p className="meta center">Tippe auf eine Zutat – sie landet direkt auf deinem Gericht.</p>
      </div>

      <div className="config-panel">
        {groupsOrdered.map((g) => {
          const opts = product.options.filter((o) => o.groupId === g.id);
          const total = groupTotal(g);
          const kinds = groupKinds(g);
          const hint = g.selection === "single" ? "Wähle 1" : [g.maxSelect ? `bis zu ${g.maxSelect} Sorten` : null, g.maxTotalQuantity ? `max. ${g.maxTotalQuantity} Portionen` : null, g.freeQuantity ? `${g.freeQuantity} gratis` : null].filter(Boolean).join(" · ");
          return (
            <section key={g.id} className="tile-group" aria-labelledby={`g-${g.id}`}>
              <h2 id={`g-${g.id}`} className="tile-group-title">{g.name} <span className="meta">{hint}</span></h2>
              <ul className="tiles">
                {opts.map((o) => {
                  const q = current.get(o.id) ?? 0;
                  const p = optionPrice(o);
                  const priceLabel = !o.available ? "ausverkauft" : o.defaultQuantity > 0 && q <= o.defaultQuantity ? "inklusive" : p > 0 ? `+${formatMoney(p)}` : "gratis";
                  const single = g.selection === "single";
                  const canAdd = o.available && (single ? q === 0 : q < o.maxQuantity && (g.maxTotalQuantity === null || total < g.maxTotalQuantity) && (q > 0 || g.maxSelect === null || kinds < g.maxSelect));
                  const canRemove = !single && q > 0 && (o.removable || q > o.defaultQuantity);
                  return (
                    <li key={o.id} className={`tile${q > 0 ? " on" : ""}${o.available ? "" : " disabled"}`}>
                      <button
                        type="button"
                        className="tile-main"
                        onClick={() => (single ? choose(g, o) : set(o, q + 1))}
                        disabled={!canAdd}
                        aria-pressed={q > 0}
                      >
                        <span className="tile-circle"><IngredientIcon k={o.modelKey ?? ""} /></span>
                        <span className="tile-name">{o.name}</span>
                        <span className="tile-price">{priceLabel}</span>
                        <span className="sr-only">{single ? " wählen" : " hinzufügen"}</span>
                      </button>
                      {q > 0 && <span className="tile-badge" aria-hidden="true">{q > 1 ? q : "✓"}</span>}
                      {canRemove && (
                        <button type="button" className="tile-minus" onClick={() => set(o, q - 1)} aria-label={`${o.name} weniger`}>−</button>
                      )}
                      <output className="sr-only">{q}</output>
                      {o.allergens.length > 0 && <span className="tile-allergen">{o.allergens.map((a) => ALLERGEN_LABELS_DE[a as Allergen] ?? a).join(", ")}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {errors.length > 0 && (
          <ul className="error-list" role="alert">
            {errors.map((e) => <li key={e.code + e.ref}>{e.message}</li>)}
          </ul>
        )}

        {shown && (
          <details className="price-box">
            <summary>Preisdetails</summary>
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
          </details>
        )}

        {allergens.length > 0 && <p className="meta"><strong>Allergene:</strong> {allergens.join(", ")}</p>}
        {notice && <p className="status" role="status">{notice} <a href="/warenkorb">Zum Warenkorb →</a></p>}
      </div>

      <div className="add-bar">
        <span className="stepper" role="group" aria-label="Anzahl">
          <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="Anzahl verringern">−</button>
          <output aria-live="polite">{count}</output>
          <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label="Anzahl erhöhen">+</button>
        </span>
        <button type="button" className="btn btn-primary add-btn" onClick={add} disabled={!price}>
          <span>In den Warenkorb</span>
          {extrasCents > 0 && <span className="add-extras">+{formatMoney(extrasCents)}</span>}
          <span className="add-total">{shown ? formatMoney(shown.unitTotalCents * count) : "–"}</span>
        </button>
      </div>
    </div>
  );
}
