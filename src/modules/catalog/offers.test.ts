import { describe, expect, it } from "vitest";
import { bestOffer, type OfferView } from "./offers";

const offer = (over: Partial<OfferView>): OfferView => ({
  offerId: null,
  sellerName: "Cartly",
  fulfilment: "cartly",
  priceCents: 10000,
  listPriceCents: null,
  shippingCents: 0,
  handlingMinutes: 0,
  stock: 5,
  ...over,
});

const seller = (id: string, priceCents: number, shippingCents: number, stock = 3, name = id): OfferView =>
  offer({ offerId: id, sellerName: name, fulfilment: "seller", priceCents, shippingCents, stock, handlingMinutes: 180 });

describe("buy box (pure)", () => {
  it("T74: the in-stock offer with the lowest landed price wins; ties and sold-out go to the first-party offer", () => {
    const first = offer({ priceCents: 10000, shippingCents: 0 });

    // A cheaper seller offer whose shipping eats the saving loses.
    expect(bestOffer([first, seller("a", 9500, 800)])).toBe(first);
    // Landed 9,400 beats 10,000.
    expect(bestOffer([first, seller("a", 9000, 400)]).offerId).toBe("a");
    // Several sellers: the lowest landed price.
    expect(bestOffer([first, seller("a", 9000, 400), seller("b", 8800, 300)]).offerId).toBe("b");
    // A tie goes to the first-party offer.
    expect(bestOffer([first, seller("a", 9600, 400)])).toBe(first);
    // Sold-out offers never win, however cheap.
    expect(bestOffer([first, seller("a", 1000, 0, 0)])).toBe(first);
    // If the first-party offer is sold out, the cheapest seller with stock wins.
    expect(bestOffer([offer({ stock: 0 }), seller("a", 11000, 0), seller("b", 10500, 0)]).offerId).toBe("b");
    // Nothing in stock anywhere: still the first-party offer (the page then says "out of stock").
    expect(bestOffer([offer({ stock: 0 }), seller("a", 900, 0, 0)]).sellerName).toBe("Cartly");
  });

  it("T122: offers within 2% of the lowest landed price are contenders; Cartly fulfilment then wins, however the list is ordered", () => {
    const cartlyOther = offer({ offerId: "c", sellerName: "Warehouse", priceCents: 10100, shippingCents: 0 }); // Cartly-fulfilled, 1% above
    const cheapSeller = seller("s", 10000, 0);
    expect(bestOffer([offer({ stock: 0 }), cheapSeller, cartlyOther]).offerId).toBe("c");
    expect(bestOffer([offer({ stock: 0 }), cartlyOther, cheapSeller]).offerId).toBe("c");
    // More than 2% above the lowest: not a contender, the cheaper seller wins.
    expect(bestOffer([offer({ stock: 0 }), cheapSeller, offer({ offerId: "c2", priceCents: 10300 })]).offerId).toBe("s");
    // Equal contenders: the shorter handling time, then the id, decide.
    expect(bestOffer([offer({ stock: 0 }), seller("b", 10000, 0), { ...seller("a", 10000, 0), handlingMinutes: 60 }]).offerId).toBe("a");
  });
});
