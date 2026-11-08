"use client";

import { useSyncExternalStore } from "react";

/**
 * Client-side basket (single restaurant in V1, as specified). Prices stored
 * here are for display only – the server re-validates and re-prices every
 * line before an order is accepted (see app/warenkorb/actions.ts).
 */
export interface CartItem {
  lineId: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantities: Record<string, number>;
  summary: string[];
  unitTotalCents: number;
  quantity: number;
}
export interface CartRestaurant { id: string; slug: string; name: string }
export interface Cart { restaurant: CartRestaurant | null; items: CartItem[] }

const KEY = "tw-cart-v1";
const EMPTY: Cart = { restaurant: null, items: [] };
const listeners = new Set<() => void>();
let cache: Cart | null = null;

function read(): Cart {
  if (cache) return cache;
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Cart) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Cart) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked – keep in memory
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function cartCount(c: Cart): number {
  return c.items.reduce((n, i) => n + i.quantity, 0);
}

/** Adds a line. Returns false if the basket belongs to another restaurant. */
export function addToCart(restaurant: CartRestaurant, item: Omit<CartItem, "lineId">, replaceOther = false): boolean {
  const cart = read();
  if (cart.restaurant && cart.restaurant.id !== restaurant.id && cart.items.length > 0 && !replaceOther) return false;
  const base = cart.restaurant?.id === restaurant.id ? cart.items : [];
  const same = base.find((i) => i.productId === item.productId && i.variantId === item.variantId && JSON.stringify(i.quantities) === JSON.stringify(item.quantities));
  const items = same
    ? base.map((i) => (i === same ? { ...i, quantity: Math.min(99, i.quantity + item.quantity) } : i))
    : [...base, { ...item, lineId: crypto.randomUUID() }];
  write({ restaurant, items });
  return true;
}

export function setLineQuantity(lineId: string, quantity: number) {
  const cart = read();
  const items = quantity <= 0 ? cart.items.filter((i) => i.lineId !== lineId) : cart.items.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.min(99, quantity) } : i));
  write({ restaurant: items.length ? cart.restaurant : null, items });
}

export function clearCart() {
  write(EMPTY);
}
