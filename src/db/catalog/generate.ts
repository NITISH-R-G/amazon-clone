import curated from "../demo-catalog.json";
import { BRANDS, PRODUCT_TYPES, SERIES, type Department, type ProductType } from "./product-types";

/** Total products in the shipped catalogue: the curated ones in `demo-catalog.json` plus the generated rest. */
export const CATALOG_SIZE = 2400;
export const TONE_COUNT = 6;

export type SeedVariant = { id: string; label: string | null; price: number; list: number | null; stock: number };

export type SeedProduct = {
  slug: string;
  title: string;
  brand: string;
  category: Department;
  /** Shared illustration: /products/<shape>-<tone>-<1|2>.svg (see scripts/generate-product-art.mjs). */
  shape: string;
  tone: number;
  /** Rating in tenths (45 = 4.5). */
  rating: number;
  count: number;
  /** ISO date (yyyy-mm-dd). */
  created: string;
  description: string;
  bullets: string[];
  specs: { label: string; value: string }[];
  optionName: string | null;
  variants: SeedVariant[];
};

/** Small seeded generator so the catalogue is identical on every run and every machine. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const START = Date.UTC(2024, 9, 1);
const END = Date.UTC(2026, 8, 28);

type Pick = <T>(items: readonly T[]) => T;

/** Spec values follow the chosen material/size when the type offers a matching value, then Model and Warranty. */
function buildSpecs(
  type: ProductType,
  brand: string,
  hints: (string | undefined)[],
  pick: Pick,
  rng: () => number,
): { label: string; value: string }[] {
  const needles = hints.filter((n): n is string => Boolean(n)).map((n) => n.toLowerCase());
  const specs = type.specs.map(([label, values]) => {
    const matching = values.filter((v) => needles.some((n) => v.toLowerCase().includes(n)));
    return { label, value: pick(matching.length > 0 ? matching : values) };
  });
  specs.push({ label: "Model", value: `${brand.slice(0, 2).toUpperCase()}-${100 + Math.floor(rng() * 900)}` });
  specs.push({ label: "Warranty", value: pick(["1 year limited", "2 years limited", "1 year limited"]) });
  return specs;
}

/**
 * Specs for a hand-written (curated) product: the type of the same department and illustration whose
 * name shares the most words with the title, with values matched to words in the title.
 */
export function specsForCurated(product: { title: string; brand: string; category: string; shape: string; slug: string }) {
  const words = product.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 || /\d/.test(w));
  const candidates = PRODUCT_TYPES.filter((t) => t.category === product.category && t.shape === product.shape);
  const score = (t: ProductType) => t.noun.toLowerCase().split(/[^a-z0-9]+/).filter((w) => words.includes(w)).length;
  const type = [...candidates].sort((a, b) => score(b) - score(a))[0];
  if (!type) return [];
  const rng = mulberry32([...product.slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  const pick: Pick = (items) => items[Math.floor(rng() * items.length)];
  return buildSpecs(type, product.brand, words, pick, rng);
}

export function generateCatalog(): SeedProduct[] {
  const rng = mulberry32(20261002);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)];
  const shuffled = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const slugs = new Set<string>(curated.products.map((p) => p.slug));
  const titles = new Set<string>(curated.products.map((p) => p.title));
  const out: SeedProduct[] = [];
  const target = CATALOG_SIZE - curated.products.length;

  for (let i = 0; i < target; i++) {
    const type: ProductType = PRODUCT_TYPES[i % PRODUCT_TYPES.length];

    let brand = "";
    let series = "";
    let mod = "";
    let size: string | undefined;
    let title = "";
    do {
      brand = pick(BRANDS[type.category]);
      series = pick(SERIES);
      mod = pick(type.mods);
      size = type.sizes ? pick(type.sizes) : undefined;
      title = `${brand} ${series} ${mod === series ? "" : `${mod} `}${type.noun}${size ? `, ${size}` : ""}`;
    } while (titles.has(title) || slugs.has(slugify(title)));
    titles.add(title);
    const slug = slugify(title);
    slugs.add(slug);

    // Price: skewed toward the lower end of the type's range, with common retail price endings.
    const [lo, hi] = type.price;
    const dollars = Math.max(5, Math.round(lo + (hi - lo) * rng() ** 1.7));
    const price = dollars * 100 - (rng() < 0.7 ? 1 : 0);
    const onSale = rng() < 0.28;
    const list = onSale ? Math.ceil((price * (1.12 + rng() * 0.3)) / 100) * 100 - 1 : null;

    const stockFor = () => {
      const roll = rng();
      if (roll < 0.04) return 0;
      if (roll < 0.12) return 1 + Math.floor(rng() * 5);
      return 6 + Math.floor(rng() ** 1.5 * 194);
    };

    const multi = type.colors.length >= 2 && rng() < 0.22;
    const variants: SeedVariant[] = multi
      ? shuffled(type.colors)
          .slice(0, 2 + Math.floor(rng() * 2))
          .map((color) => ({ id: `${slug}-${slugify(color)}`, label: color, price, list, stock: stockFor() }))
      : [{ id: `var-${slug}`, label: null, price, list, stock: stockFor() }];

    const specs = buildSpecs(type, brand, [mod, size], pick, rng);

    const rating = 33 + Math.round(((rng() + rng() + rng()) / 3) * 17);
    const count = Math.round(10 ** (1 + rng() * 2.9));
    const created = new Date(START + Math.floor(rng() * (END - START))).toISOString().slice(0, 10);

    const features = shuffled(type.features);
    const bulletCount = 3 + Math.floor(rng() * 2);
    const extra = features[bulletCount]; // a feature that is not already a bullet
    out.push({
      slug,
      title,
      brand,
      category: type.category,
      shape: type.shape,
      tone: Math.floor(rng() * TONE_COUNT),
      rating,
      count,
      created,
      description: `${pick(type.blurbs)} ${extra}. ${pick(type.uses)}`,
      bullets: features.slice(0, bulletCount),
      specs,
      optionName: multi ? "Color" : null,
      variants,
    });
  }
  return out;
}
