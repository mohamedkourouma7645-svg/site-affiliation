import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_TRANSITIONS, canTransition, nextStatuses } from "../src";

describe("order status machine", () => {
  it("follows the delivery flow", () => {
    expect(canTransition("awaiting_acceptance", "accepted", "restaurant", "delivery")).toBe(true);
    expect(canTransition("ready", "picked_up", "courier", "delivery")).toBe(true);
    expect(canTransition("ready", "picked_up", "courier", "pickup")).toBe(false);
    expect(canTransition("in_delivery", "delivered", "customer", "delivery")).toBe(false);
  });
  it("lets the customer cancel only before acceptance", () => {
    expect(canTransition("awaiting_acceptance", "cancelled", "customer", "delivery")).toBe(true);
    expect(canTransition("preparing", "cancelled", "customer", "delivery")).toBe(false);
  });
  it("offers pickup completion to the restaurant", () => {
    expect(nextStatuses("ready", "restaurant", "pickup")).toEqual(["collected"]);
  });
  it("matches the SQL enum and transition table", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/20261108000000_init.sql", import.meta.url), "utf8");
    const enumBody = /create type public\.order_status as enum \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    expect(enumBody.match(/'(\w+)'/g)?.map((s) => s.slice(1, -1))).toEqual([...ORDER_STATUSES]);
    for (const t of ORDER_TRANSITIONS) {
      expect(sql, `${t.from}->${t.to}`).toContain(`('${t.from}', '${t.to}'`);
    }
  });
});
