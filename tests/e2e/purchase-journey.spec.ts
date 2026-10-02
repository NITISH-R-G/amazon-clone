import { expect, test } from "@playwright/test";

// Tier-1 journey (docs/testing-strategy.md): product -> cart -> checkout -> confirmation,
// through the real app boundary. Runs once per project (desktop, mobile) against a fresh
// in-memory database, so each project buys a different product and stock stays valid.

const product = (name: "desktop" | "mobile") =>
  name === "desktop"
    ? { slug: "ember-stoneware-mug-2-pack", title: "Ember Stoneware Mug, 2-Pack", total: "$25.50" }
    : { slug: "linden-ceramic-pour-over-set", title: "Linden Ceramic Pour-Over Coffee Set", total: "$45.36" };
// Totals are hand-worked from the provisional rules: mug 1899 + 499 shipping + 152 tax = 2550;
// pour-over 4200 (free shipping) + 336 tax = 4536.

test("search results lead to a product, and key pages do not overflow horizontally", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: /search/i }).or(page.getByPlaceholder("Search products")).first().fill("kettle");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/s\?.*k=kettle/);

  for (const path of ["/", "/s", "/s?k=kettle", "/dp/linden-ceramic-pour-over-set", "/cart"]) {
    await page.goto(path);
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(sw, `horizontal overflow on ${path}`).toBeLessThanOrEqual(cw);
  }
});

test("a guest can buy a product from product page to confirmation", async ({ page }, testInfo) => {
  const item = product(testInfo.project.name as "desktop" | "mobile");

  await page.goto(`/dp/${item.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: item.title })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await expect(page.getByRole("link", { name: item.title }).first()).toBeVisible();
  await page.getByRole("link", { name: "Checkout" }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Address", { exact: true }).fill("12 Analytical Way");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("ZIP code").fill("78701");
  await page.getByLabel("Email for your receipt").fill("ada@example.test");
  await page.getByLabel("Card number").fill("4242424242424242"); // published demo test card
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("Security code").fill("123");
  await page.getByRole("button", { name: "Place your order" }).click();

  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible();
  await expect(page.getByTestId("order-number")).toContainText(/^AR-/);
  await expect(page.getByTestId("order-total")).toHaveText(item.total);

  // The cart was emptied by the order.
  await expect(page.getByRole("link", { name: /0 items in cart/ })).toBeVisible();
});
