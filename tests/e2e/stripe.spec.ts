import { expect, test, type Page } from "@playwright/test";

// Real Stripe TEST-mode payments through the Payment Element. Runs only when test keys are present in the environment
// (STRIPE_SECRET_KEY=sk_test_..., NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...); never with live keys. The order is
// completed by the server asking Stripe (the redirect alone proves nothing), so no webhook forwarding is needed here.

const hasKeys = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_"));

async function toPayment(page: Page, slug: string) {
  await page.goto(`/dp/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Address", { exact: true }).fill("12 Analytical Way");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("ZIP code").fill("78701");
  await page.getByLabel("Email for your receipt").fill("ada@example.test");
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await expect(page).toHaveURL(/\/checkout\/pay\//);
}

async function payWithCard(page: Page, number: string) {
  const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await frame.getByPlaceholder("1234 1234 1234 1234").fill(number);
  await frame.getByPlaceholder("MM / YY").fill("12 / 34");
  await frame.getByPlaceholder("CVC").fill("123");
  await page.getByRole("button", { name: /^Pay / }).click();
}

test.describe("stripe test mode", () => {
  test.skip(!hasKeys, "no Stripe test keys in the environment");

  test("a successful test card places the order after the server confirms with Stripe", async ({ page }, info) => {
    test.skip(info.project.name === "mobile");
    await toPayment(page, "ember-stoneware-mug-2-pack");
    await payWithCard(page, "4242424242424242");
    await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("order-number")).toBeVisible();
  });

  test("a declined test card shows a clear error and creates no order", async ({ page }, info) => {
    test.skip(info.project.name === "mobile");
    await toPayment(page, "walnut-cutting-board");
    await payWithCard(page, "4000000000000002");
    await expect(page.getByRole("alert")).toContainText(/declined|could not be completed/i, { timeout: 45_000 });
    await expect(page).toHaveURL(/\/checkout\/pay\//);
  });
});
