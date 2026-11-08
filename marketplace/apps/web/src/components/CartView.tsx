"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatMoney } from "@app/core";
import { checkCart, type CheckResult } from "@/app/warenkorb/actions";
import { clearCart, setLineQuantity, useCart } from "@/lib/cart";

export function CartView() {
  const cart = useCart();
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, start] = useTransition();

  if (!cart.restaurant || cart.items.length === 0) {
    return (
      <div className="empty" role="status">
        <h2>Dein Warenkorb ist leer.</h2>
        <p><Link href="/restaurants">Restaurants entdecken</Link></p>
      </div>
    );
  }
  const subtotal = cart.items.reduce((n, i) => n + i.unitTotalCents * i.quantity, 0);

  function check() {
    setResult(null);
    start(async () => {
      setResult(await checkCart({
        restaurantId: cart.restaurant!.id,
        fulfilment,
        items: cart.items.map(({ lineId, productId, variantId, quantities, quantity, unitTotalCents }) => ({ lineId, productId, variantId, quantities, quantity, unitTotalCents })),
      }));
    });
  }

  return (
    <div className="cart">
      <p className="meta">
        Bestellung bei <Link href={`/restaurant/${cart.restaurant.slug}`}>{cart.restaurant.name}</Link>
      </p>
      <ul className="cart-list">
        {cart.items.map((i) => (
          <li key={i.lineId} className="cart-line">
            <div>
              <strong>{i.productName}</strong>
              <span className="meta block">{i.summary.join(" · ")}</span>
              {result && !result.ok && result.lineErrors?.[i.lineId] && <span className="error block">{result.lineErrors[i.lineId]}</span>}
            </div>
            <span className="stepper" role="group" aria-label={`Anzahl ${i.productName}`}>
              <button type="button" onClick={() => { setResult(null); setLineQuantity(i.lineId, i.quantity - 1); }} aria-label={i.quantity === 1 ? `${i.productName} entfernen` : `${i.productName} weniger`}>{i.quantity === 1 ? "🗑" : "−"}</button>
              <output>{i.quantity}</output>
              <button type="button" onClick={() => { setResult(null); setLineQuantity(i.lineId, i.quantity + 1); }} aria-label={`${i.productName} mehr`}>+</button>
            </span>
            <span className="price">{formatMoney(i.unitTotalCents * i.quantity)}</span>
          </li>
        ))}
      </ul>

      <fieldset className="segmented">
        <legend className="sr-only">Lieferung oder Abholung</legend>
        {(["delivery", "pickup"] as const).map((m) => (
          <label key={m}>
            <input type="radio" name="fulfilment" checked={fulfilment === m} onChange={() => { setResult(null); setFulfilment(m); }} />
            <span>{m === "delivery" ? "Lieferung" : "Abholung"}</span>
          </label>
        ))}
      </fieldset>

      <div className="price-box">
        <div className="price-row"><span>Zwischensumme</span><span>{formatMoney(subtotal)}</span></div>
        {result?.ok && (
          <>
            <div className="price-row"><span>Liefergebühr</span><span>{formatMoney(result.totals.deliveryFeeCents)}</span></div>
            <div className="price-row"><span>Servicegebühr</span><span>{formatMoney(result.totals.serviceFeeCents)}</span></div>
            <div className="price-row total"><span>Gesamt</span><span data-testid="order-total">{formatMoney(result.totals.totalCents)}</span></div>
            <p className="meta">
              Enthaltene MwSt.: {Object.entries(result.totals.vatByRate).map(([bp, c]) => `${Number(bp) / 100} %: ${formatMoney(c)}`).join(" · ")}
            </p>
          </>
        )}
      </div>

      {result?.ok && result.lines.some((l) => l.changed) && <p className="error" role="alert">Preise haben sich geändert. Bitte prüfe die Summe.</p>}
      {result?.ok && result.totals.belowMinimumOrder && <p className="error" role="alert">Mindestbestellwert für Lieferung nicht erreicht.</p>}
      {result && !result.ok && <p className="error" role="alert">{result.error}</p>}
      {result?.ok && !result.totals.belowMinimumOrder && (
        <p className="success" role="status">
          ✓ Bestellung vom Server geprüft: Preise und Zutaten stimmen.
          {result.testMode && " Testmodus: Es wird nichts gespeichert, geliefert oder bezahlt. Echtes Bestellen und Bezahlen folgen in den nächsten Phasen."}
        </p>
      )}

      <div className="row">
        <button type="button" className="btn btn-primary" onClick={check} disabled={pending}>
          {pending ? "Wird geprüft…" : "Testbestellung prüfen"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => { setResult(null); clearCart(); }}>Warenkorb leeren</button>
      </div>
    </div>
  );
}
