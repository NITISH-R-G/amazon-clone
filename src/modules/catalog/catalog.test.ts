import { describe, expect, it } from "vitest";
import { createTestApp } from "@/test-support/app";

describe("catalog", () => {
  it("T1: returns a product by slug with its price and stock, and null for an unknown slug", async () => {
    const app = await createTestApp();

    const product = await app.catalog.getProduct("test-kettle");
    expect(product?.title).toBe("Test Kettle");
    expect(product?.variants).toEqual([
      expect.objectContaining({ id: "var-kettle", priceCents: 2999, stock: 5 }),
    ]);

    expect(await app.catalog.getProduct("nope")).toBeNull();
  });
});
