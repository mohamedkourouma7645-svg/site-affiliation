import { describe, expect, it } from "vitest";
import { applyBasisPoints, assertCents, formatMoney, roundHalfAwayFromZero, vatIncludedInGross } from "../src";

describe("money", () => {
  it("rejects non-integer cents", () => {
    expect(() => assertCents(1.5)).toThrow(RangeError);
    expect(assertCents(150)).toBe(150);
  });
  it("rounds half away from zero", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(2.4999)).toBe(2);
  });
  it("applies basis points", () => {
    expect(applyBasisPoints(1780, 1500)).toBe(267); // 15 % of 17,80 = 2,67
    expect(applyBasisPoints(1000, 1250)).toBe(125);
  });
  it("extracts VAT from gross prices", () => {
    expect(vatIncludedInGross(1070, 700)).toBe(70);
    expect(vatIncludedInGross(1190, 1900)).toBe(190);
    expect(vatIncludedInGross(1780, 700)).toBe(116); // 116.45...
  });
  it("formats euros for Germany", () => {
    expect(formatMoney(1780).replace(/\s/g, " ")).toBe("17,80 €");
  });
});
