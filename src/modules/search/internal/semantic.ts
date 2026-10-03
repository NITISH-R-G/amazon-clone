// Concept-based ("semantic") query understanding. Pure and deterministic: no embeddings, no external service.
//
// Honest scope: this maps what people *mean* ("keep my coffee hot", "gift for a runner", "work from home setup") to the
// product types that satisfy that intent, using a small curated concept lexicon. It is not a learned vector model; the
// lexicon is the limit of what it understands. It is used only as an extra candidate source next to the lexical search.

export type Concept = {
  /** Human-readable intent shown to the customer ("keeping drinks hot"). */
  label: string;
  /** Query words (or word starts) that signal this intent. */
  triggers: string[];
  /** Product type slugs that satisfy it, most relevant first. */
  types: string[];
};

export const CONCEPTS: Concept[] = [
  { label: "keeping drinks hot or cold", triggers: ["hot", "cold", "warm", "thermos", "insulat", "commute", "drink", "drinks", "beverage", "sip"], types: ["insulated-water-bottle", "travel-tumbler", "gooseneck-kettle"] },
  { label: "making coffee and tea", triggers: ["coffee", "brew", "espresso", "tea", "caffeine", "morning"], types: ["pour-over-coffee-set", "gooseneck-kettle", "stoneware-mug"] },
  { label: "running and fitness", triggers: ["run", "runner", "running", "jog", "marathon", "workout", "gym", "fitness", "exercise", "cardio", "train", "training"], types: ["running-shoes", "fitness-band", "smartwatch"] },
  { label: "a work-from-home desk setup", triggers: ["home office", "wfh", "workspace", "desk", "setup", "office", "remote", "productive", "productivity"], types: ["mechanical-keyboard", "monitor-stand", "office-chairs", "wireless-mouse", "desk-mat", "usb-c-dock"] },
  { label: "comfortable seating and sleep-friendly rooms", triggers: ["cozy", "cosy", "comfy", "comfortable", "relax", "lounge", "snuggle", "chilly"], types: ["throw-blanket", "sofas", "soy-wax-candle"] },
  { label: "reading and lighting", triggers: ["reading", "read", "bright", "lighting", "dim", "evening", "light"], types: ["floor-reading-lamp", "table-lamp"] },
  { label: "travelling light", triggers: ["travel", "trip", "vacation", "holiday", "flight", "airport", "luggage", "weekend", "pack", "packing", "abroad"], types: ["carry-on-suitcase", "everyday-backpack", "packing-cubes", "universal-travel-adapter", "passport-wallet", "weekender-duffel"] },
  { label: "listening to music", triggers: ["music", "listen", "listening", "song", "podcast", "audio", "noise", "sound", "bass", "wireless audio"], types: ["over-ear-headphones", "true-wireless-earbuds", "portable-bluetooth-speaker", "bookshelf-speakers", "on-ear-headphones"] },
  { label: "staying connected on the go", triggers: ["call", "calls", "phone", "mobile", "camera", "selfie", "photos"], types: ["smartphones", "tablets", "true-wireless-earbuds"] },
  { label: "watching and entertainment", triggers: ["movie", "movies", "watch tv", "netflix", "streaming", "cinema", "game", "gaming", "console"], types: ["televisions", "portable-bluetooth-speaker", "bookshelf-speakers"] },
  { label: "sun and outdoor style", triggers: ["sun", "sunny", "beach", "glare", "outdoor", "summer", "hike", "hiking"], types: ["polarized-sunglasses", "everyday-backpack", "running-shoes"] },
  { label: "cold-weather style", triggers: ["winter", "snow", "freezing", "frosty", "autumn"], types: ["wool-beanie", "throw-blanket", "field-watch"] },
  { label: "everyday carry and style", triggers: ["wallet", "cards", "minimal", "slim", "pocket", "style", "accessory", "accessories"], types: ["leather-card-holder", "passport-wallet", "field-watch"] },
  { label: "cooking and kitchen prep", triggers: ["cook", "cooking", "chop", "chopping", "dinner", "recipe", "kitchen", "prep"], types: ["cutting-board", "gooseneck-kettle", "stoneware-mug"] },
  { label: "decorating a home", triggers: ["decor", "decorate", "decoration", "plant", "plants", "houseplant", "scent", "fragrance", "ambience", "ambiance", "gift", "housewarming"], types: ["stoneware-planter", "soy-wax-candle", "throw-blanket", "table-lamp"] },
  { label: "laptops and computing", triggers: ["laptop", "study", "student", "college", "coding", "programming", "work", "computer"], types: ["laptops", "laptop-stand", "mechanical-keyboard", "tablets"] },
  { label: "time and schedules", triggers: ["time", "schedule", "alarm", "wrist", "timer"], types: ["smartwatch", "field-watch", "fitness-band"] },
  { label: "everyday bags", triggers: ["bag", "carry", "commuter", "school", "books", "daypack"], types: ["everyday-backpack", "weekender-duffel"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const matches = (words: string[], text: string, trigger: string): boolean =>
  trigger.includes(" ")
    ? ` ${text} `.includes(` ${trigger} `)
    : words.some((w) => w === trigger || (trigger.length >= 4 && w.startsWith(trigger)));

export type Intent = {
  /** Concepts that matched, strongest first. */
  concepts: { label: string; hits: number }[];
  /** Product type slugs to search, at most `maxTypes`, in concept strength then lexicon order. */
  types: string[];
};

/** What the query probably means, or null when nothing in the lexicon applies. Deterministic. */
export function interpretQuery(query: string, maxTypes = 4): Intent | null {
  const text = norm(query);
  const words = text.split(" ").filter(Boolean);
  if (words.length === 0) return null;
  const scored = CONCEPTS.map((c, order) => ({ c, order, hits: c.triggers.filter((t) => matches(words, text, t)).length })).filter((x) => x.hits > 0);
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.hits - a.hits || a.order - b.order);
  const types: string[] = [];
  for (const { c } of scored.slice(0, 3)) for (const t of c.types) if (!types.includes(t)) types.push(t);
  return { concepts: scored.slice(0, 3).map((x) => ({ label: x.c.label, hits: x.hits })), types: types.slice(0, maxTypes) };
}

export type FusionWeights = { lexical: number; semantic: number; business: number };

/** The lexical match was complete: trust the words. Otherwise (partial or empty) trust the meaning. */
export const WEIGHTS_EXACT: FusionWeights = { lexical: 0.6, semantic: 0.3, business: 0.1 };
export const WEIGHTS_MEANING: FusionWeights = { lexical: 0.25, semantic: 0.65, business: 0.1 };

/**
 * Deterministic hybrid ranking over two candidate lists (each already in its own rank order):
 *
 *   score = lexical * 1/(1 + lexicalRank)  +  semantic * 1/(1 + semanticRank)  +  business * rating/5
 *
 * A product missing from a list contributes 0 for that term. Ties break on product id. No product appears twice.
 * `business` is the product's existing rating signal; filters were already applied to both candidate lists.
 */
export function fuse<T extends { id: string; rating: number }>(
  lexical: T[],
  semantic: T[],
  weights: FusionWeights,
): (T & { hybridScore: number })[] {
  const lexRank = new Map(lexical.map((p, i) => [p.id, i]));
  const semRank = new Map(semantic.map((p, i) => [p.id, i]));
  const byId = new Map<string, T>();
  for (const p of [...lexical, ...semantic]) if (!byId.has(p.id)) byId.set(p.id, p);
  return [...byId.values()]
    .map((p) => {
      const l = lexRank.has(p.id) ? 1 / (1 + (lexRank.get(p.id) as number)) : 0;
      const m = semRank.has(p.id) ? 1 / (1 + (semRank.get(p.id) as number)) : 0;
      const hybridScore = Math.round((weights.lexical * l + weights.semantic * m + weights.business * (p.rating / 5)) * 10_000) / 10_000;
      return { ...p, hybridScore };
    })
    .sort((a, b) => b.hybridScore - a.hybridScore || a.id.localeCompare(b.id));
}

/** Runs the optional semantic stage; any failure yields the fallback (the lexical result) instead of an error. */
export async function withFallback<T>(attempt: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await attempt();
  } catch {
    return fallback;
  }
}
