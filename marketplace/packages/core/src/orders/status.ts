/**
 * Order lifecycle. The same enum exists in PostgreSQL (order_status) and
 * transitions are re-checked in the database (see migration, function
 * app.order_transition_allowed). Keep both in sync – a test enforces it.
 */
export const ORDER_STATUSES = [
  "received", // Bestellung eingegangen (payment pending / being confirmed)
  "awaiting_acceptance", // Wartet auf Annahme durch das Restaurant
  "accepted",
  "preparing",
  "ready",
  "picked_up", // Vom Fahrer abgeholt
  "in_delivery",
  "delivered",
  "collected", // Vom Kunden abgeholt (Selbstabholung)
  "cancelled",
  "rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Fulfilment = "delivery" | "pickup";
export type Actor = "system" | "customer" | "restaurant" | "courier" | "admin";

interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  actors: Actor[];
  fulfilment?: Fulfilment;
}

export const ORDER_TRANSITIONS: readonly Transition[] = [
  { from: "received", to: "awaiting_acceptance", actors: ["system"] }, // payment authorised (webhook)
  { from: "received", to: "cancelled", actors: ["system", "customer", "admin"] },
  { from: "awaiting_acceptance", to: "accepted", actors: ["restaurant", "admin"] },
  { from: "awaiting_acceptance", to: "rejected", actors: ["restaurant", "admin", "system"] },
  { from: "awaiting_acceptance", to: "cancelled", actors: ["customer", "admin"] },
  { from: "accepted", to: "preparing", actors: ["restaurant", "admin"] },
  { from: "accepted", to: "cancelled", actors: ["restaurant", "admin"] },
  { from: "preparing", to: "ready", actors: ["restaurant", "admin"] },
  { from: "preparing", to: "cancelled", actors: ["admin"] },
  { from: "ready", to: "picked_up", actors: ["courier", "admin"], fulfilment: "delivery" },
  { from: "ready", to: "collected", actors: ["restaurant", "admin"], fulfilment: "pickup" },
  { from: "ready", to: "cancelled", actors: ["admin"] },
  { from: "picked_up", to: "in_delivery", actors: ["courier", "admin"], fulfilment: "delivery" },
  { from: "in_delivery", to: "delivered", actors: ["courier", "admin"], fulfilment: "delivery" },
];

export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set(["delivered", "collected", "cancelled", "rejected"]);

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor, fulfilment: Fulfilment): boolean {
  return ORDER_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.actors.includes(actor) && (t.fulfilment === undefined || t.fulfilment === fulfilment),
  );
}

export function nextStatuses(from: OrderStatus, actor: Actor, fulfilment: Fulfilment): OrderStatus[] {
  return ORDER_TRANSITIONS.filter(
    (t) => t.from === from && t.actors.includes(actor) && (t.fulfilment === undefined || t.fulfilment === fulfilment),
  ).map((t) => t.to);
}
