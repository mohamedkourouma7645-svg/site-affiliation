import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { color, contrastRatio, semantic } from "../src";

describe("design tokens", () => {
  it("meets WCAG AA contrast for text pairs", () => {
    expect(contrastRatio(semantic.text, semantic.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(semantic.textMuted, semantic.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(semantic.onPrimary, semantic.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(semantic.onAccent, semantic.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(semantic.sponsored, color.white)).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps the CSS variables in sync", () => {
    const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
    for (const [name, value] of Object.entries({ primary: semantic.primary, accent: semantic.accent, text: semantic.text, bg: semantic.bg })) {
      expect(css, name).toContain(`--c-${name}: ${value};`);
    }
  });
});
