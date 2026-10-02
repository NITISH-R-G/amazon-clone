import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Tier-1/2 journeys (docs/testing-strategy.md) through the real app boundary. Both projects
// (desktop, mobile) share one fresh in-memory database, so each test buys a different product
// per project and stock stays valid. Totals are compared with what the cart showed, not hand-worked.

const isMobile = (info: TestInfo) => info.project.name === "mobile";
const pick = <T,>(info: TestInfo, desktop: T, mobile: T) => (isMobile(info) ? mobile : desktop);

async function addFromProductPage(page: Page, slug: string) {
  await page.goto(`/dp/${slug}`);
  const title = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
  return title;
}

async function fillShipping(page: Page) {
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Address", { exact: true }).fill("12 Analytical Way");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("ZIP code").fill("78701");
  await page.getByLabel("Email for your receipt").fill("ada@example.test");
}

async function fillCard(page: Page, number: string) {
  await page.getByLabel("Card number").fill(number); // published demo test cards only
  await page.getByLabel("Expiry (MM/YY)").fill("12/30");
  await page.getByLabel("Security code").fill("123");
}

const placeOrder = (page: Page) => page.getByRole("button", { name: /Place your order/ }).click();

const cartTotal = async (page: Page) =>
  (await page.getByText("Estimated total").locator("xpath=following-sibling::*[1]").innerText()).trim();

async function register(page: Page, info: TestInfo, returnTo: string) {
  const email = `${info.project.name}-${Date.now()}@example.test`;
  await page.goto(`/register?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  return email;
}

async function signOut(page: Page, info: TestInfo) {
  if (isMobile(info)) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("discovery: home to search to a product, with recovery from a typo and from no results", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const search = page.getByPlaceholder("Search products");
  await search.fill("kettle");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/s\?.*k=kettle/);
  await expect(page.getByRole("heading", { level: 1, name: /Results for/ })).toBeVisible();
  await page.getByRole("link", { name: /Ceramic Gooseneck Kettle|Ceramic Kettle/ }).first().click();
  await expect(page).toHaveURL(/\/dp\//);
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();

  // A misspelled query still finds products.
  await page.goto("/s?k=wireles%20headphnes");
  await expect(page.getByRole("link", { name: /Headphones/ }).first()).toBeVisible();

  // A query with nothing in common offers a way out.
  await page.goto("/s?k=something-that-does-not-exist");
  await expect(page.getByText(/No products match/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Kitchen" }).last()).toBeVisible();

  // An out-of-stock product says so and cannot be added.
  await page.goto("/dp/linen-throw");
  await expect(page.getByText("Out of stock").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /unavailable/i }).first()).toBeDisabled();
});

test("purchase: a guest buys a product, then creates an account and finds the order", async ({ page }, info) => {
  const slug = pick(info, "ember-stoneware-mug-2-pack", "walnut-cutting-board");
  const title = await addFromProductPage(page, slug);
  const total = await cartTotal(page);
  await page.getByRole("link", { name: "Checkout" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await fillShipping(page);
  await fillCard(page, "4242424242424242");
  await placeOrder(page);

  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible();
  const orderNumber = (await page.getByTestId("order-number").innerText()).trim();
  expect(orderNumber).toMatch(/^AR-/);
  await expect(page.getByTestId("order-total")).toHaveText(total);
  await expect(page.getByText(title).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /0 items in cart/ })).toBeVisible();

  // Registering claims the guest order into the account's history.
  await page.getByRole("link", { name: "Create account" }).click();
  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill(`buyer-${info.project.name}-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByText(orderNumber)).toBeVisible();
  await page.getByRole("link", { name: new RegExp(orderNumber) }).click();
  await expect(page.getByRole("heading", { level: 1, name: orderNumber })).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText(total);
});

test("recovery: a declined card keeps the cart and address, and a retry succeeds", async ({ page }, info) => {
  await addFromProductPage(page, pick(info, "felt-desk-mat", "merino-beanie"));
  await page.getByRole("link", { name: "Checkout" }).click();

  await fillShipping(page);
  await fillCard(page, "4000000000000002"); // published demo number that is always declined
  await placeOrder(page);

  await expect(page.getByRole("alert").filter({ hasText: /declined/i })).toBeVisible();
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue("12 Analytical Way");
  await expect(page.getByLabel("Card number")).toHaveValue(""); // card data is never echoed back

  await fillCard(page, "4242424242424242");
  await placeOrder(page);
  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible();
});

test("account: the guest cart survives registration and sign-in; orders stay private after sign-out", async ({ page }, info) => {
  const title = await addFromProductPage(page, pick(info, "travel-adapter", "packing-cubes-set"));

  const email = await register(page, info, "/cart");
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page.getByLabel("Email for your receipt")).toHaveValue(email); // prefilled from the account
  await fillShipping(page);
  await page.getByLabel("Email for your receipt").fill(email);
  await fillCard(page, "4242424242424242");
  await placeOrder(page);
  await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible();
  await page.getByRole("link", { name: "View in your orders" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^AR-/ })).toBeVisible();

  await signOut(page, info);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);

  // A wrong password is explained; the right one returns to the orders.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "do not match" })).toBeVisible();
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByText(/^AR-/).first()).toBeVisible();
});

test("key pages do not overflow horizontally", async ({ page }) => {
  for (const path of ["/", "/s", "/s?k=kettle", "/dp/linden-ceramic-pour-over-set", "/cart", "/sign-in", "/register"]) {
    await page.goto(path);
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(sw, `horizontal overflow on ${path}`).toBeLessThanOrEqual(cw);
  }
});
