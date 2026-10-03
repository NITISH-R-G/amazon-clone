import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { DbOrTx } from "@/lib/db";
import type { Clock } from "@/lib/ports";
import { err, ok, type Result } from "@/lib/result";
import type { Catalog } from "@/modules/catalog";
import type { OrdersModule } from "@/modules/orders";
import { reviews } from "../schema";

export type Review = {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: Date;
};

export type ReviewSummary = {
  count: number;
  /** One decimal, 0 when there are no reviews. */
  average: number;
  /** Count of reviews with 5, 4, 3, 2 and 1 stars (index 0 is five stars). */
  distribution: [number, number, number, number, number];
  verifiedCount: number;
};

export type ReviewsDeps = {
  db: DbOrTx;
  clock: Clock;
  catalog: Pick<Catalog, "getProduct" | "setRating">;
  orders: Pick<OrdersModule, "listOrders">;
};

export const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(10).max(4000),
});

export type SubmitError = "NOT_FOUND" | "NOT_ELIGIBLE" | "ALREADY_REVIEWED" | "INVALID";

export function createReviews({ db, clock, catalog, orders }: ReviewsDeps) {
  async function summary(productId: string, tx?: DbOrTx): Promise<ReviewSummary> {
    const rows = await (tx ?? db)
      .select({ rating: reviews.rating, n: sql<number>`count(*)::int`, verified: sql<number>`count(*) filter (where ${reviews.verified})::int` })
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .groupBy(reviews.rating);
    const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
    let total = 0;
    let sum = 0;
    let verifiedCount = 0;
    for (const r of rows) {
      distribution[5 - r.rating] = r.n;
      total += r.n;
      sum += r.rating * r.n;
      verifiedCount += r.verified;
    }
    return { count: total, average: total ? Math.round((sum / total) * 10) / 10 : 0, distribution, verifiedCount };
  }

  async function list(productId: string, limit = 6, tx?: DbOrTx): Promise<Review[]> {
    return (tx ?? db)
      .select({
        id: reviews.id,
        authorName: reviews.authorName,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        verified: reviews.verified,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit);
  }

  /**
   * Who may review: a signed-in user with a delivered order that contains one of the product's variants, who has not
   * reviewed it yet. Returns the variant they bought, or why not.
   */
  async function eligibility(userId: string, productId: string, slug: string): Promise<Result<{ variantId: string }, SubmitError>> {
    const product = await catalog.getProduct(slug);
    if (!product || product.id !== productId) return err("NOT_FOUND");
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)))
      .limit(1);
    if (existing) return err("ALREADY_REVIEWED");
    const variantIds = new Set(product.variants.map((v) => v.id));
    for (const order of await orders.listOrders({ userId })) {
      if (order.status !== "delivered") continue;
      const item = order.items.find((i) => variantIds.has(i.variantId));
      if (item) return ok({ variantId: item.variantId });
    }
    return err("NOT_ELIGIBLE");
  }

  async function submit(
    user: { id: string; name: string },
    slug: string,
    input: unknown,
  ): Promise<Result<Review, SubmitError>> {
    const parsed = reviewInputSchema.safeParse(input);
    if (!parsed.success) return err("INVALID");
    const product = await catalog.getProduct(slug);
    if (!product) return err("NOT_FOUND");
    const allowed = await eligibility(user.id, product.id, slug);
    if (!allowed.ok) return allowed;
    const [row] = await db
      .insert(reviews)
      .values({
        productId: product.id,
        variantId: allowed.value.variantId,
        userId: user.id,
        authorName: user.name,
        verified: true, // established from the delivered order above, never from the request
        createdAt: clock.now(),
        ...parsed.data,
      })
      .returning();
    const s = await summary(product.id);
    await catalog.setRating(product.id, Math.round(s.average * 10), s.count);
    return ok({ id: row.id, authorName: row.authorName, rating: row.rating, title: row.title, body: row.body, verified: row.verified, createdAt: row.createdAt });
  }

  return { summary, list, eligibility, submit };
}

export type ReviewsModule = ReturnType<typeof createReviews>;
