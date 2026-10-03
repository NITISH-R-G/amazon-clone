import { expect, test, type Browser, type Page } from "@playwright/test";
import { generateCatalog } from "../../src/db/catalog/generate";

// Two shoppers, one unit. Both put the last unit in their cart and check out at the same moment: the stock
// reservation lets exactly one of them buy it, and the other gets a clear "sold out" result without being charged.

const lastUnit = generateCatalog()
  .filter((p) => p.variants.length === 1 && p.variants[0].stock === 1 && p.variants[0].offers.length === 0)
  .at(-1)!;

async function shopperAtCheckout(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/dp/${lastUnit.slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Address", { exact: true }).fill("1 Race Road");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("ZIP code").fill("78701");
  await page.getByLabel("Email for your receipt").fill("race@example.test");
  await page.getByLabel("Card number").fill("4242424242424242");
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("Security code").fill("123");
  return page;
}

test("inventory race: two checkouts for the last unit, exactly one succeeds", async ({ browser }, info) => {
  test.skip(info.project.name === "mobile", "one race per run is enough; both projects share one database");
  const [a, b] = await Promise.all([shopperAtCheckout(browser, "Ada Lovelace"), shopperAtCheckout(browser, "Grace Hopper")]);

  const place = (page: Page) => page.getByRole("button", { name: /Place your order|Continue to payment/ }).click();
  await Promise.all([place(a), place(b)]);

  const outcome = async (page: Page) => {
    await Promise.race([
      page.getByRole("heading", { name: /Order placed/ }).waitFor({ timeout: 20_000 }),
      page.getByRole("alert").filter({ hasText: /sold out|no longer available|out of stock/i }).first().waitFor({ timeout: 20_000 }),
    ]);
    return (await page.getByRole("heading", { name: /Order placed/ }).count()) > 0 ? "bought" : "sold-out";
  };
  const results = (await Promise.all([outcome(a), outcome(b)])).sort();
  expect(results).toEqual(["bought", "sold-out"]);

  // The loser kept their cart and was not charged; the product now reads as unavailable.
  const loser = results[0] === "bought" ? b : a;
  await loser.goto(`/dp/${lastUnit.slug}`);
  await expect(loser.getByText(/Out of stock|Currently unavailable/i).first()).toBeVisible();
});
