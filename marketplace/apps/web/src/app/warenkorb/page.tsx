import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Warenkorb", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container section">
      <h1 className="page-title">Warenkorb</h1>
      <CartView />
    </div>
  );
}
