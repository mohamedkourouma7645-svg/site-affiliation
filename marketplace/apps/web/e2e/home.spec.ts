import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home renders hero, address search and categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bestell dein Essen");
  await expect(page.getByLabel("Lieferadresse")).toBeVisible();
  await expect(page.getByRole("link", { name: /Pizza/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Döner/ })).toBeVisible();
});

test("delivery search requires an address", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Restaurants finden" }).click();
  await expect(page.locator("#address-error")).toHaveText("Bitte gib eine Adresse ein.");
  await expect(page).toHaveURL("/");
});

test("search navigates to an honest result page", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Lieferadresse").fill("Alexanderplatz 1, 10178 Berlin");
  await page.getByRole("button", { name: "Restaurants finden" }).click();
  await expect(page).toHaveURL(/\/restaurants\?modus=lieferung&adresse=/);
  await expect(page.getByText("Suche Restaurants für: Alexanderplatz 1, 10178 Berlin")).toBeVisible();
  // Without configured partners the page must say so – never show fake restaurants.
  await expect(page.getByText("noch keine Partnerrestaurants")).toBeVisible();
});

test("pickup mode works without an address", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Abholung", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Abholung" })).toBeChecked();
  await page.getByRole("button", { name: "Restaurants finden" }).click();
  await expect(page).toHaveURL(/modus=abholung/);
});

test("category link filters results", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Pizza/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pizza");
});

test("health endpoint and security headers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect((await res.json()).status).toBe("ok");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

test("home has no detectable accessibility violations (WCAG 2.1 AA)", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
