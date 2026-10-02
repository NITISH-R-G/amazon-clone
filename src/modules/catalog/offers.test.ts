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
});
