import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCALES, ROOT_CATEGORIES, messages, t } from "../src";

describe("i18n", () => {
  it("has the same keys in every language", () => {
    const keys = Object.keys(messages("de")).sort();
    for (const l of LOCALES) expect(Object.keys(messages(l)).sort()).toEqual(keys);
  });
  it("interpolates params", () => {
    expect(t("de", "home.searchingFor", { address: "Berlin" })).toBe("Suche Restaurants für: Berlin");
  });
});

describe("category reference data", () => {
  it("has unique slugs that are all seeded", () => {
    const slugs = ROOT_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const seed = readFileSync(new URL("../../../supabase/seed.sql", import.meta.url), "utf8");
    for (const s of slugs) expect(seed).toContain(`'${s}'`);
  });
});
