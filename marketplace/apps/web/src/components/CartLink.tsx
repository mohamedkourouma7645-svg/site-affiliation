"use client";

import Link from "next/link";
import { cartCount, useCart } from "@/lib/cart";

export function CartLink() {
  const n = cartCount(useCart());
  return (
    <Link href="/warenkorb" className="cart-link" aria-label={`Warenkorb, ${n} Artikel`}>
      🛒 <span className="cart-count">{n}</span>
    </Link>
  );
}
