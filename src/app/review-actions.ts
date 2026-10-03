"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApp } from "@/server/runtime";
import { readUser } from "@/server/session";
import type { FormState } from "./form-state";

const messages: Record<string, string> = {
  NOT_FOUND: "We could not find that product.",
  NOT_ELIGIBLE: "Only customers with a delivered order of this product can review it.",
  ALREADY_REVIEWED: "You have already reviewed this product.",
  INVALID: "Choose a rating, add a short title and write at least 10 characters.",
};

export async function submitReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = z.string().min(1).max(200).safeParse(formData.get("slug"));
  const user = await readUser();
  if (!slug.success) return { error: messages.NOT_FOUND };
  if (!user) return { error: "Sign in to write a review." };
  const result = await (await getApp()).reviews.submit(user, slug.data, {
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!result.ok) return { error: messages[result.error] ?? "Could not post your review." };
  revalidatePath(`/dp/${slug.data}`);
  return { values: { posted: "1" } };
}
