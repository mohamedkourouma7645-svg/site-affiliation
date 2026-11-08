/**
 * Money is always handled as integer minor units (cents) to avoid
 * floating point errors. Never use floats for amounts.
 */
export type Cents = number;

export function assertCents(value: number, label = "amount"): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be an integer number of cents, got ${value}`);
  }
  return value;
}

/** Commercial rounding (half away from zero) of a fractional cent value. */
export function roundHalfAwayFromZero(value: number): Cents {
  const sign = value < 0 ? -1 : 1;
  // Add a tiny epsilon to counter binary representation errors like 2.675 -> 2.67499999.
  return sign * Math.round(Math.abs(value) + 1e-9);
}

/** Multiply cents by basis points (1 bp = 0.01 %) with correct rounding. */
export function applyBasisPoints(amount: Cents, basisPoints: number): Cents {
  assertCents(amount);
  assertCents(basisPoints, "basisPoints");
  return roundHalfAwayFromZero((amount * basisPoints) / 10_000);
}

/**
 * VAT contained in a gross (VAT-inclusive) amount.
 * German consumer prices must be displayed gross (PAngV), so we extract VAT.
 * rateBasisPoints: 700 = 7 %, 1900 = 19 %.
 */
export function vatIncludedInGross(gross: Cents, rateBasisPoints: number): Cents {
  assertCents(gross);
  assertCents(rateBasisPoints, "rateBasisPoints");
  return roundHalfAwayFromZero((gross * rateBasisPoints) / (10_000 + rateBasisPoints));
}

export function formatMoney(amount: Cents, currency = "EUR", locale = "de-DE"): string {
  assertCents(amount);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount / 100);
}
