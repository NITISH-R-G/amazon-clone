// Deterministic recommendation scoring (pure; no database, no randomness). Not machine learning: a transparent weighted
// sum of signals, documented so it can be explained and tested.
//
//   same product type            +4        same category (other type)  +2
//   same brand                   +2        shared attribute value      +0.5 each (at most 3)
//   price proximity              0..2      (2 at the same price, 0 at 2.7x or more away; log scale)
//   rating                       0..1.5    (rating / 5 * 1.5)
//   popularity                   0..1      (rating count, capped at 1,000)
//   on sale                      +0.75
//
// With several seeds (recently viewed products) each seed's contribution is weighted by recency: 1, 1/2, 1/3...
// Ties break on product id so the order never depends on the database.

import type { Cents } from "@/lib/money";

export type Signals = {
  id: string;
  typeId: string | null;
  categoryId: string | null;
  brand: string;
  priceCents: Cents;
  attributes: Record<string, string>;
};

export type Candidate = Signals & {
  rating: number;
  ratingCount: number;
  onSale: boolean;
  inStock: boolean;
};

const similarity = (seed: Signals, c: Candidate): number => {
  let score = 0;
  if (seed.typeId && c.typeId === seed.typeId) score += 4;
  else if (seed.categoryId && c.categoryId === seed.categoryId) score += 2;
  if (c.brand === seed.brand) score += 2;
  const shared = Object.entries(seed.attributes).filter(([k, v]) => c.attributes[k] === v).length;
  score += Math.min(shared, 3) * 0.5;
  if (seed.priceCents > 0 && c.priceCents > 0) {
    score += 2 * Math.max(0, 1 - Math.abs(Math.log(c.priceCents / seed.priceCents)));
  }
  return score;
};

export function scoreCandidate(seeds: Signals[], c: Candidate): number {
  const fromSeeds = seeds.reduce((sum, seed, i) => sum + similarity(seed, c) / (i + 1), 0);
  const intrinsic = (c.rating / 5) * 1.5 + Math.min(c.ratingCount, 1000) / 1000 + (c.onSale ? 0.75 : 0);
  return Math.round((fromSeeds + intrinsic) * 1000) / 1000;
}

/** Highest score first; seeds and unavailable products never appear. */
export function rank(seeds: Signals[], candidates: Candidate[], limit: number): Candidate[] {
  const seedIds = new Set(seeds.map((s) => s.id));
  return candidates
    .filter((c) => c.inStock && !seedIds.has(c.id))
    .map((c) => ({ c, score: scoreCandidate(seeds, c) }))
    .sort((a, b) => b.score - a.score || a.c.id.localeCompare(b.c.id))
    .slice(0, limit)
    .map((x) => x.c);
}
