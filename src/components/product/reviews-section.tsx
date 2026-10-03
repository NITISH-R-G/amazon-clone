import { BadgeCheck } from "lucide-react";
import type { Review, ReviewSummary } from "@/modules/reviews";
import { RatingStars } from "./rating-stars";
import { ReviewForm } from "./review-form";

const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

/** Real aggregate (from the review rows), a star distribution, the latest reviews and, if eligible, a form. */
export function ReviewsSection({
  slug,
  summary,
  reviews,
  canReview,
}: {
  slug: string;
  summary: ReviewSummary;
  reviews: Review[];
  canReview: boolean;
}) {
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="mt-20 grid gap-10 border-t pt-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
      <div className="space-y-4">
        <h2 id="reviews-heading" className="text-xl font-semibold tracking-[-0.01em]">
          Customer reviews
        </h2>
        {summary.count > 0 ? (
          <>
            <div className="space-y-1">
              <p className="num text-[32px] leading-10 font-semibold">{summary.average.toFixed(1)} <span className="text-base font-normal text-muted-foreground">out of 5</span></p>
              <RatingStars rating={summary.average} />
              <p className="text-sm text-muted-foreground">
                {summary.count} {summary.count === 1 ? "review" : "reviews"}, {summary.verifiedCount} verified {summary.verifiedCount === 1 ? "purchase" : "purchases"}
              </p>
            </div>
            <ul className="space-y-1.5" aria-label="Rating distribution">
              {summary.distribution.map((n, i) => (
                <li key={i} className="num flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-muted-foreground">{5 - i} star</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full bg-foreground" style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }} />
                  </span>
                  <span className="w-6 text-right text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
        {canReview ? <ReviewForm slug={slug} /> : null}
      </div>
      <ul className="divide-y border-y" data-testid="review-list">
        {reviews.map((r) => (
          <li key={r.id} className="space-y-1.5 py-5">
            <RatingStars rating={r.rating} />
            <h3 className="text-[15px] font-semibold">{r.title}</h3>
            <p className="text-sm text-muted-foreground">
              {r.authorName} · {date.format(r.createdAt)}
              {r.verified ? (
                <span className="ml-2 inline-flex items-center gap-1 font-medium text-foreground">
                  <BadgeCheck aria-hidden="true" className="size-3.5" /> Verified purchase
                </span>
              ) : null}
            </p>
            <p className="text-[15px] leading-6">{r.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
