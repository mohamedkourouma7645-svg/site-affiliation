import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const unitPrice = (page: Page) => page.getByTestId("unit-price");
const plus = (page: Page, name: string) => page.getByRole("button", { name: `${name} mehr` });

async function openOwnPizza(page: Page) {
  await page.goto("/restaurants?kategorie=pizza");
  await page.getByRole("link", { name: "Test-Pizzeria (Demo)" }).click();
  await expect(page.getByText("Testmodus:")).toBeVisible();
  await page.getByRole("link", { name: /Eigene Pizza/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Eigene Pizza");
}

test("configure a pizza with live prices and size-dependent extras", async ({ page }) => {
  await openOwnPizza(page);
  await expect(unitPrice(page)).toHaveText("9,00 €");
  await plus(page, "Salami").click();
  await expect(unitPrice(page)).toHaveText("11,00 €");
  await plus(page, "Mozzarella").click();
  await plus(page, "Champignons").click();
  await plus(page, "Hähnchen").click();
  await plus(page, "Oliven").click();
  // 9,00 + 2,00 + 1,50 + 1,00 + 2,50 + 0,80
  await expect(unitPrice(page)).toHaveText("16,80 €");
  await page.getByText("32 cm").click();
  // 11,50 + 2,50 + 1,50 + 1,00 + 3,00 + 0,80 (salami/chicken cost more on 32 cm)
  await expect(unitPrice(page)).toHaveText("20,30 €");
  // The preview reflects the toppings.
  await expect(page.getByRole("img", { name: "Vorschau deiner Pizza" })).toBeVisible();
});

test("compatibility rules and limits are enforced", async ({ page }) => {
  await openOwnPizza(page);
  await plus(page, "Ananas").click();
  await plus(page, "Thunfisch").click();
  await expect(page.locator(".error-list")).toContainText("Ananas ist nicht mit Thunfisch kombinierbar");
  await expect(page.getByRole("button", { name: /In den Warenkorb/ })).toBeDisabled();
  await page.getByRole("button", { name: "Thunfisch weniger" }).click();
  await expect(page.getByRole("button", { name: /In den Warenkorb/ })).toBeEnabled();
  // Max quantity per ingredient (Ananas: 2)
  await plus(page, "Ananas").click();
  await expect(plus(page, "Ananas")).toBeDisabled();
});

test("removing a default ingredient does not change the price", async ({ page }) => {
  await openOwnPizza(page);
  await page.getByRole("button", { name: "Mozzarella weniger" }).click();
  await expect(unitPrice(page)).toHaveText("9,00 €");
});

test("cart: add, server check, delivery vs pickup", async ({ page }) => {
  await openOwnPizza(page);
  await plus(page, "Salami").click();
  await page.getByRole("button", { name: "Anzahl erhöhen" }).click();
  await page.getByRole("button", { name: /In den Warenkorb · 22,00 €/ }).click();
  await expect(page.getByRole("link", { name: "Warenkorb, 2 Artikel" })).toBeVisible();

  await page.getByRole("link", { name: "Warenkorb, 2 Artikel" }).click();
  await expect(page.getByText("26 cm · Salami")).toBeVisible();
  await page.getByRole("button", { name: "Testbestellung prüfen" }).click();
  // 2 × 11,00 + 2,49 delivery
  await expect(page.getByTestId("order-total")).toHaveText("24,49 €");
  await expect(page.getByText("Bestellung vom Server geprüft")).toBeVisible();

  await page.getByText("Abholung", { exact: true }).click();
  await page.getByRole("button", { name: "Testbestellung prüfen" }).click();
  await expect(page.getByTestId("order-total")).toHaveText("22,00 €");
});

test("server ignores manipulated browser prices", async ({ page }) => {
  await openOwnPizza(page);
  await page.getByRole("button", { name: /In den Warenkorb/ }).click();
  await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem("tw-cart-v1")!);
    c.items[0].unitTotalCents = 1; // attacker sets price to 0,01 €
    localStorage.setItem("tw-cart-v1", JSON.stringify(c));
  });
  await page.goto("/warenkorb");
  await page.getByText("Abholung", { exact: true }).click();
  await page.getByRole("button", { name: "Testbestellung prüfen" }).click();
  await expect(page.getByTestId("order-total")).toHaveText("9,00 €");
  await expect(page.getByText("Preise haben sich geändert")).toBeVisible();
});

test("delivery below minimum order is flagged", async ({ page }) => {
  await page.goto("/restaurant/test-pizzeria");
  await page.getByRole("link", { name: /Mineralwasser/ }).click();
  await page.getByRole("button", { name: /In den Warenkorb/ }).click();
  await page.goto("/warenkorb");
  await page.getByRole("button", { name: "Testbestellung prüfen" }).click();
  await expect(page.getByText("Mindestbestellwert für Lieferung nicht erreicht")).toBeVisible();
});

test("configurator page has no detectable accessibility violations", async ({ page }) => {
  await openOwnPizza(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});
