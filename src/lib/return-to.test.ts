import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("T44: keeps same-site paths and rejects anything that could leave the site", () => {
    expect(safeReturnTo("/orders/abc?x=1")).toBe("/orders/abc?x=1");
    for (const bad of ["https://evil.test", "//evil.test", "/" + String.fromCharCode(92) + "evil.test", "javascript:alert(1)", "", undefined, 42]) {
      expect(safeReturnTo(bad)).toBe("/orders");
    }
    expect(safeReturnTo("//evil.test", "/")).toBe("/");
  });
});
