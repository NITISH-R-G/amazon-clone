"use client";

import { useActionState } from "react";
import { submitReviewAction } from "@/app/review-actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shown only to customers whose delivered order contains this product. */
export function ReviewForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReviewAction, {});
  if (state.values?.posted) {
    return (
      <p role="status" className="rounded-lg border p-4 text-sm font-medium">
        Thanks, your verified review is posted.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-xl bg-muted p-5">
      <input type="hidden" name="slug" value={slug} />
      <h3 className="text-base font-semibold">Write a review</h3>
      <p className="text-sm text-muted-foreground">You bought this, so your review will be marked as a verified purchase.</p>
      <div>
        <Label htmlFor="review-rating" className="mb-1.5">
          Rating
        </Label>
        <select id="review-rating" name="rating" defaultValue="5" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm pointer-fine:h-9">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="review-title" className="mb-1.5">
          Title
        </Label>
        <Input id="review-title" name="title" maxLength={120} required />
      </div>
      <div>
        <Label htmlFor="review-body" className="mb-1.5">
          Review
        </Label>
        <textarea id="review-body" name="body" rows={4} minLength={10} maxLength={4000} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Posting..." : "Post review"}
      </Button>
    </form>
  );
}
