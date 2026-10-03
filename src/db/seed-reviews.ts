import { count, eq, sql } from "drizzle-orm";
import { products, reviews, variants } from "@/db/schema";
import { createSystemIds, systemClock } from "@/lib/ports";
import { createAuth } from "@/modules/auth";
import { createOrders } from "@/modules/orders";
import type { Database } from "@/server/app";
import { mulberry32 } from "./catalog/generate";

/** A demo account for walking through the store (invented test values, not a real person). */
export const DEMO_ACCOUNT = { name: "Demo Shopper", email: "demo@cartly.test", password: "cartly-demo-1" } as const;

const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Drew", "Robin", "Kai", "Noor", "Mina", "Theo", "Lena", "Omar", "Priya", "Marta"];
const INITIAL = "ABCDEFGHJKLMNPRSTW";

const BY_RATING: Record<number, { titles: string[]; bodies: string[] }> = {
  5: {
    titles: ["Exactly what I wanted", "Great quality", "Would buy again", "Better than expected", "Excellent"],
    bodies: [
      "Arrived quickly and works exactly as described. The build feels solid and it has been trouble free since the first day.",
      "Really happy with this. It does everything I needed and the finish is better than the photos suggested.",
      "Easy to set up and noticeably well made for the price. I have already recommended it to a friend.",
    ],
  },
  4: {
    titles: ["Very good", "Solid choice", "Good value", "Happy overall"],
    bodies: [
      "Does the job well and feels sturdy. One small thing I would change, but nothing that stops me recommending it.",
      "Good value and good quality. Delivery was on time and the packaging was sensible.",
      "Works as advertised. A couple of minor details could be better, but I am glad I bought it.",
    ],
  },
  3: {
    titles: ["It is fine", "Average", "Okay for the price"],
    bodies: [
      "It works, but it is not as polished as I hoped. Fine for occasional use.",
      "Middle of the road. Nothing wrong with it, nothing special either.",
    ],
  },
  2: {
    titles: ["Not great", "Disappointed"],
    bodies: ["Quality did not match the description for me. It works, but I expected more at this price."],
  },
  1: { titles: ["Would not recommend"], bodies: ["It stopped working properly after a short time and I had to return it."] },
};

/** One star rating drawn around the product's existing demo rating, so the catalogue stays plausible. */
function drawRating(rng: () => number, centreTenths: number): number {
  const centre = Math.max(1, Math.min(5, centreTenths / 10 || 4));
  const r = Math.round(centre + (rng() + rng() - 1) * 1.6);
  return Math.max(1, Math.min(5, r));
}

/**
 * Written reviews for every product (deterministic, invented reviewers and text), the products' displayed rating
 * recomputed from them, and a demo account with delivered orders (so verified reviewing can be shown).
 * Idempotent: does nothing once reviews exist.
 */
export async function seedDemoExtras(db: Database) {
  const [{ value }] = await db.select({ value: count() }).from(reviews);
  if (value > 0) return;

  const base = Date.parse("2026-10-01T00:00:00Z");
  const all = await db.select({ id: products.id, slug: products.slug, tenths: products.ratingTenths }).from(products);
  const rows: (typeof reviews.$inferInsert)[] = [];
  for (const p of all) {
    const rng = mulberry32([...p.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 11));
    const n = 2 + Math.floor(rng() * 7);
    for (let i = 0; i < n; i++) {
      const rating = drawRating(rng, p.tenths);
      const pool = BY_RATING[rating];
      rows.push({
        productId: p.id,
        authorName: `${FIRST[Math.floor(rng() * FIRST.length)]} ${INITIAL[Math.floor(rng() * INITIAL.length)]}.`,
        rating,
        title: pool.titles[Math.floor(rng() * pool.titles.length)],
        body: pool.bodies[Math.floor(rng() * pool.bodies.length)],
        verified: rng() < 0.78,
        createdAt: new Date(base - Math.floor(rng() * 220) * 86_400_000 - Math.floor(rng() * 86_400_000)),
      });
    }
  }
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 1000) await tx.insert(reviews).values(rows.slice(i, i + 1000));
    // The rating shown on cards and pages is the real aggregate of these reviews.
    await tx.execute(sql`
      update products p set rating_tenths = round(r.avg * 10)::int, rating_count = r.n
      from (select product_id, avg(rating)::float as avg, count(*)::int as n from reviews group by product_id) r
      where r.product_id = p.id`);
  });

  await seedDemoAccount(db);
}

/** The demo account with three delivered orders (placed days ago), so reviews and order history have substance. */
async function seedDemoAccount(db: Database) {
  const ids = createSystemIds();
  const auth = createAuth({ db, clock: systemClock, ids });
  const registered = await auth.register(DEMO_ACCOUNT);
  if (!registered.ok) return; // already there
  const orders = createOrders({ db, clock: systemClock });
  const picks = await db
    .select({ variantId: variants.id, title: products.title, price: variants.priceCents, sku: variants.sku, label: variants.label })
    .from(products)
    .innerJoin(variants, eq(variants.productId, products.id))
    .where(sql`${products.featuredRank} is not null and ${variants.stock} > 5`)
    .orderBy(products.featuredRank)
    .limit(3);
  const address = { name: DEMO_ACCOUNT.name, line1: "10 Sample Street", city: "Springfield", region: "IL", postalCode: "62701", country: "US" };
  for (const [i, pick] of picks.entries()) {
    const placedAt = new Date(Date.now() - (6 + i * 4) * 86_400_000);
    const created = await orders.createOrder({
      owner: { userId: registered.value.id },
      number: `DEMO-${1001 + i}`,
      idempotencyKey: `demo-seed-${i}`,
      items: [
        {
          variantId: pick.variantId,
          title: pick.title,
          unitPriceCents: pick.price,
          quantity: 1,
          imageUrl: null,
          sku: pick.sku,
          variantLabel: pick.label,
          sellerName: "Cartly",
          fulfilment: "cartly",
          offerId: null,
        },
      ],
      subtotalCents: pick.price,
      discountCents: 0,
      couponCode: null,
      shippingCents: 0,
      taxCents: 0,
      totalCents: pick.price,
      address,
      contactEmail: DEMO_ACCOUNT.email,
      placedAt,
      holdExpiresAt: null,
      deliveryExtraMinutes: 0,
    });
    await orders.markPaid(created.id, { paidAt: placedAt, reference: `demo_${i}`, brand: "visa", last4: "4242" });
  }
}
