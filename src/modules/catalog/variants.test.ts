import { describe, expect, it } from "vitest";
import { dimensionsOf, nearestVariant, optionStates, resolveVariant, variantLabel } from "./variants";

const v = (id: string, selections: Record<string, string>, stock: number, priceCents: number) => ({ id, selections, stock, priceCents });

const phone = [
  v("blk-128-8", { color: "Black", storage: "128 GB", ram: "8 GB" }, 3, 59900),
  v("blk-256-8", { color: "Black", storage: "256 GB", ram: "8 GB" }, 0, 64900),
  v("blk-256-12", { color: "Black", storage: "256 GB", ram: "12 GB" }, 4, 69900),
  v("sil-256-8", { color: "Silver", storage: "256 GB", ram: "8 GB" }, 5, 64900),
  v("sil-512-12", { color: "Silver", storage: "512 GB", ram: "12 GB" }, 2, 79900),
];

describe("variant resolution (pure)", () => {
  it("T59: dimensions follow the definition order and vocabulary, else first appearance", () => {
    expect(dimensionsOf(phone).map((d) => [d.key, d.values])).toEqual([
      ["color", ["Black", "Silver"]],
      ["storage", ["128 GB", "256 GB", "512 GB"]],
      ["ram", ["8 GB", "12 GB"]],
    ]);

    const defs = [
      { key: "ram", label: "RAM", values: ["8 GB", "12 GB", "16 GB"] },
      { key: "storage", label: "Storage", values: ["128 GB", "256 GB", "512 GB", "1 TB"] },
      { key: "color", label: "Colour", values: ["Silver", "Black"] },
    ];
    expect(dimensionsOf(phone, defs).map((d) => [d.key, d.label, d.values])).toEqual([
      ["ram", "RAM", ["8 GB", "12 GB"]],
      ["storage", "Storage", ["128 GB", "256 GB", "512 GB"]],
      ["color", "Colour", ["Silver", "Black"]],
    ]);
    // Without a definition the label is derived from the key.
    expect(dimensionsOf(phone).map((d) => d.label)).toEqual(["Color", "Storage", "RAM"]);
  });

  it("T60: a full selection resolves to exactly one variant, or to none", () => {
    expect(resolveVariant(phone, { color: "Black", storage: "256 GB", ram: "12 GB" })?.id).toBe("blk-256-12");
    expect(resolveVariant(phone, { color: "Silver", storage: "128 GB", ram: "8 GB" })).toBeNull();
    expect(resolveVariant(phone, { color: "Black" })).toBeNull(); // incomplete
    expect(resolveVariant([v("only", {}, 1, 100)], {})?.id).toBe("only"); // a product with no dimensions
  });

  it("T61: picking a value keeps as much of the current selection as a real variant allows", () => {
    const current = { color: "Black", storage: "128 GB", ram: "8 GB" };
    // Silver does not come in 128 GB: keep the RAM, move storage to the nearest real combination.
    expect(nearestVariant(phone, current, { key: "color", value: "Silver" })?.id).toBe("sil-256-8");
    // An exact combination wins even when it is out of stock (the page then says so).
    expect(nearestVariant(phone, current, { key: "storage", value: "256 GB" })?.id).toBe("blk-256-8");
    // Ties prefer something in stock, then the lower price.
    expect(nearestVariant(phone, { color: "Black", storage: "256 GB", ram: "8 GB" }, { key: "ram", value: "12 GB" })?.id).toBe("blk-256-12");
    expect(nearestVariant(phone, current, { key: "color", value: "Nope" })).toBeNull();
  });

  it("T62: option states say which values have stock and which fit the current selection", () => {
    const states = optionStates(phone, { color: "Black", storage: "256 GB", ram: "8 GB" });
    expect(states.color.Silver).toEqual({ inStock: true, compatible: true });
    expect(states.storage["128 GB"]).toEqual({ inStock: true, compatible: true });
    expect(states.storage["512 GB"]).toEqual({ inStock: true, compatible: false }); // exists, but not with Black / 8 GB
    expect(states.ram["12 GB"]).toEqual({ inStock: true, compatible: true });

    const soldOut = optionStates([v("a", { color: "Black" }, 0, 1), v("b", { color: "White" }, 2, 1)], { color: "White" });
    expect(soldOut.color.Black.inStock).toBe(false);
    expect(soldOut.color.White.inStock).toBe(true);
  });

  it("T63: a variant label reads the selections in dimension order", () => {
    expect(variantLabel({ ram: "8 GB", color: "Black", storage: "256 GB" }, dimensionsOf(phone))).toBe("Black, 256 GB, 8 GB");
    expect(variantLabel({}, [])).toBeNull();
  });
});
