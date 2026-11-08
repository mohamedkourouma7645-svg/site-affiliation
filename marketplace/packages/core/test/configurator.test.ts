import { describe, expect, it } from "vitest";
import { validateSelection, visibleLayers } from "../src";
import { testPizza } from "./fixtures";

const codes = (errs: { code: string }[]) => errs.map((e) => e.code);

describe("configurator engine", () => {
  it("accepts the default configuration", () => {
    expect(validateSelection(testPizza(), { variantId: "26cm", quantities: {} })).toEqual([]);
  });
  it("rejects unknown variants and options", () => {
    expect(codes(validateSelection(testPizza(), { variantId: "50cm", quantities: { foo: 1 } }))).toEqual(["UNKNOWN_VARIANT", "UNKNOWN_OPTION"]);
  });
  it("enforces exclusive choices", () => {
    const errs = validateSelection(testPizza(), { variantId: "26cm", quantities: { bbq: 1 } });
    expect(codes(errs)).toContain("SINGLE_CHOICE_VIOLATED");
    expect(validateSelection(testPizza(), { variantId: "26cm", quantities: { bbq: 1, tomato: 0 } })).toEqual([]);
  });
  it("enforces mandatory groups and non-removable ingredients", () => {
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { tomato: 0 } }))).toContain("GROUP_MIN_NOT_MET");
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { classic: 0, wholegrain: 1 } }))).toContain("NOT_REMOVABLE");
  });
  it("enforces quantity limits", () => {
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { salami: 4 } }))).toContain("QUANTITY_ABOVE_MAX");
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { salami: -1 } }))).toContain("INVALID_QUANTITY");
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { salami: 1.5 } }))).toContain("INVALID_QUANTITY");
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { salami: 3, mushrooms: 3, chicken: 3, olives: 2 } }))).toContain("GROUP_TOTAL_EXCEEDED");
  });
  it("rejects unavailable ingredients", () => {
    expect(codes(validateSelection(testPizza(), { variantId: "26cm", quantities: { pineapple: 1 } }))).toContain("OPTION_UNAVAILABLE");
  });
  it("applies compatibility rules", () => {
    const errs = validateSelection(testPizza(), { variantId: "26cm", quantities: { tomato: 0, bbq: 1, olives: 1 } });
    expect(codes(errs)).toEqual(["RULE_EXCLUDES"]);
  });
  it("lists visible layers in group order", () => {
    const layers = visibleLayers(testPizza(), { variantId: "26cm", quantities: { salami: 2, mozzarella: 0 } });
    expect(layers.map((l) => `${l.option.id}x${l.quantity}`)).toEqual(["classicx1", "tomatox1", "salamix2"]);
  });
});
