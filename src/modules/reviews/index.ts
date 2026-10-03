// Public interface of the reviews module. Import only from here.
export { createReviews, reviewInputSchema } from "./internal/reviews";
export type { Review, ReviewSummary, ReviewsDeps, ReviewsModule, SubmitError } from "./internal/reviews";
