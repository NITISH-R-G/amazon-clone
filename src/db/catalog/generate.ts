import curated from "../demo-catalog.json";
import { BRANDS, PRODUCT_TYPES, SERIES, type Department, type ProductType } from "./product-types";
import { RICH_TYPES } from "./rich-types";
import type { AttrDef, TypeDef } from "./types";

/** Total products in the shipped catalogue: the curated ones in `demo-catalog.json` plus the generated rest. */
export const CATALOG_SIZE = 2400;
export const TONE_COUNT = 6;

export type { TypeDef, AttrDef };

export type Selections = Record<string, string>;

export type SeedVariant = {
  id: string;
  sku: string;
  /** "Black, 256 GB, 8 GB", or null for a product without variations. */
  label: string | null;
  selections: Selections;
  price: number;
  list: number | null;
  stock: number;
  /** Illustration tone (the picture) for this variant: colours differ, other dimensions share the product's. */
  tone: number;
};

export type SeedProduct = {
  slug: string;
  title: string;
  brand: string;
  category: Department;
  typeSlug: string;
  /** Shared illustration: /products/<shape>-<tone>-<1|2>.svg (see scripts/generate-product-art.mjs). */
  shape: string;
  /** Rating in tenths (45 = 4.5). */
  rating: number;
  count: number;
  /** ISO date (yyyy-mm-dd). */
  created: string;
  description: string;
  bullets: string[];
  /** Typed values by attribute key (specs). */
  attributes: Record<string, string>;
  /** The same values as a display table in the type's order. */
  specs: { label: string; value: string }[];
  /** "Color / Storage / RAM": which dimensions the variants differ by, or null. */
  optionName: string | null;
  variants: SeedVariant[];
};

export const EXTRA_CATEGORIES = [
  { id: "cat-electronics", slug: "electronics", name: "Electronics", position: 7 },
  { id: "cat-fashion", slug: "fashion", name: "Fashion", position: 8 },
  { id: "cat-furniture", slug: "furniture", name: "Furniture", position: 9 },
];

/** Small seeded generator so the catalogue is identical on every run and every machine. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const keyOf = (label: string) => slugify(label).replace(/-/g, "_");

// ---------------------------------------------------------------- type definitions

/** The 35 first-generation types: colour as the only variation, their spec tables become typed attributes. */
function fromLegacy(t: ProductType): TypeDef {
  const attrs: AttrDef[] = [];
  if (t.colors.length >= 2) attrs.push({ key: "color", label: "Color", role: "variation", facet: false, values: t.colors });
  for (const [label, values] of t.specs) {
    attrs.push({ key: keyOf(label), label, role: "spec", facet: values.length >= 2 && values.length <= 8, values });
  }
  attrs.push({ key: "model", label: "Model", role: "spec", facet: false, values: [] });
  attrs.push({ key: "warranty", label: "Warranty", role: "spec", facet: false, values: ["1 year limited", "2 years limited"] });
  return {
    slug: slugify(t.noun),
    name: t.noun,
    category: t.category,
    shape: t.shape,
    noun: t.noun,
    mods: t.mods,
    sizes: t.sizes,
    price: t.price,
    attrs,
    features: t.features,
    blurbs: t.blurbs,
    uses: t.uses,
    variantShare: 0.22,
  };
}

/** 35 legacy types + 8 rich types. */
export const TYPE_DEFS: TypeDef[] = [...PRODUCT_TYPES.map(fromLegacy), ...RICH_TYPES];

// Products per rich type; the legacy types share the rest equally.
const RICH_QUOTA: Record<string, number> = {
  smartphones: 90,
  laptops: 80,
  tablets: 55,
  televisions: 55,
  sofas: 60,
  "office-chairs": 55,
  "running-shoes": 110,
  "t-shirts": 110,
};

// ---------------------------------------------------------------- colours and pictures

const COLOR_TONE: Record<string, number> = {
  Black: 0, Midnight: 0, Navy: 3, Graphite: 3, "Space Grey": 3, Charcoal: 5, Silver: 5, Grey: 4, Slate: 4,
  Titanium: 4, Olive: 4, Blue: 1, Stone: 1, Sand: 1, Oat: 2, White: 2, Ivory: 2, Fog: 2, Canvas: 1, Steel: 5,
};

/** One picture tone per distinct colour of a product (preferred tone, else the next free one). */
function colorTones(colors: string[], fallback: number): Map<string, number> {
  const used = new Set<number>();
  const out = new Map<string, number>();
  for (const color of colors) {
    let tone = COLOR_TONE[color] ?? fallback;
    for (let i = 0; used.has(tone) && i < TONE_COUNT; i++) tone = (tone + 1) % TONE_COUNT;
    used.add(tone);
    out.set(color, tone);
  }
  return out;
}

// ---------------------------------------------------------------- shared helpers

type Pick = <T>(items: readonly T[]) => T;

const START = Date.UTC(2024, 9, 1);
const END = Date.UTC(2026, 8, 28);

function labelOf(selections: Selections, dims: AttrDef[]): string | null {
  const parts = dims.map((d) => selections[d.key]).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Typed spec values: follow a hint (material, size, a word in the title) when the vocabulary offers a match. */
function buildAttributes(type: TypeDef, brand: string, hints: (string | undefined)[], pick: Pick, rng: () => number) {
  const needles = hints.filter((n): n is string => Boolean(n)).map((n) => n.toLowerCase());
  const attributes: Record<string, string> = {};
  const specs: { label: string; value: string }[] = [];
  for (const attr of type.attrs.filter((a) => a.role === "spec")) {
    let value: string;
    if (attr.values.length === 0) value = `${brand.slice(0, 2).toUpperCase()}-${100 + Math.floor(rng() * 900)}`;
    else {
      const matching = attr.values.filter((v) => needles.some((n) => v.toLowerCase().includes(n)));
      value = pick(matching.length > 0 ? matching : attr.values);
    }
    attributes[attr.key] = value;
    specs.push({ label: attr.label, value });
  }
  return { attributes, specs };
}

/** Which type a curated (hand-written) product belongs to, with matching typed values. */
export function curatedFacts(product: { title: string; brand: string; category: string; shape: string; slug: string }) {
  const words = product.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 || /\d/.test(w));
  const candidates = TYPE_DEFS.filter((t) => t.category === product.category && t.shape === product.shape);
  const score = (t: TypeDef) => t.noun.toLowerCase().split(/[^a-z0-9]+/).filter((w) => words.includes(w)).length;
  const type = [...candidates].sort((a, b) => score(b) - score(a))[0];
  if (!type) return null;
  const rng = mulberry32([...product.slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  const pick: Pick = (items) => items[Math.floor(rng() * items.length)];
  return { typeSlug: type.slug, ...buildAttributes(type, product.brand, words, pick, rng) };
}

/** Tone per variant for a curated product: colours get their own picture, other options share the product's. */
export function curatedVariantTones(variants: { label: string }[], key: string, productTone: number): number[] {
  if (key !== "color") return variants.map(() => productTone);
  const tones = colorTones(variants.map((v) => v.label), productTone);
  return variants.map((v) => tones.get(v.label) ?? productTone);
}

// ---------------------------------------------------------------- generator

export function generateCatalog(): SeedProduct[] {
  const rng = mulberry32(20261002);
  const pick: Pick = (items) => items[Math.floor(rng() * items.length)];
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
  const target = CATALOG_SIZE - curated.products.length;

  // Which type each product belongs to: rich quotas first, the remainder spread over the legacy types.
  const richCount = Object.values(RICH_QUOTA).reduce((a, b) => a + b, 0);
  const legacy = TYPE_DEFS.filter((t) => !(t.slug in RICH_QUOTA));
  const plan: TypeDef[] = [];
  for (const type of TYPE_DEFS.filter((t) => t.slug in RICH_QUOTA)) for (let i = 0; i < RICH_QUOTA[type.slug]; i++) plan.push(type);
  for (let i = 0; i < target - richCount; i++) plan.push(legacy[i % legacy.length]);

  const out: SeedProduct[] = [];
  for (const [index, type] of plan.entries()) {
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
    const base = dollars * 100 - (rng() < 0.7 ? 1 : 0);
    const onSale = rng() < 0.28;
    const saleFactor = 1.12 + rng() * 0.3;

    const stockFor = () => {
      const roll = rng();
      if (roll < 0.04) return 0;
      if (roll < 0.12) return 1 + Math.floor(rng() * 5);
      return 6 + Math.floor(rng() ** 1.5 * 194);
    };

    // Variations: rich types always have them; legacy types only for a share of products (colour).
    const dims = type.attrs.filter((a) => a.role === "variation");
    const rich = type.slug in RICH_QUOTA;
    let combos: Selections[] = [{}];
    if (dims.length > 0 && (rich || rng() < (type.variantShare ?? 0))) {
      const chosen = dims.map((d) => {
        const n = d.values.length;
        const floor = Math.max(2, Math.ceil(n * 0.5));
        const k = n <= 2 ? n : rich ? floor + Math.floor(rng() * (n - floor + 1)) : 2 + Math.floor(rng() * 2);
        const keep = new Set(shuffled(d.values).slice(0, Math.min(k, n)));
        return { key: d.key, values: d.values.filter((v) => keep.has(v)) };
      });
      combos = chosen.reduce<Selections[]>(
        (acc, d) => acc.flatMap((sel) => d.values.map((value) => ({ ...sel, [d.key]: value }))),
        [{}],
      );
      if (type.allowed) combos = combos.filter((c) => (type.allowed as (s: Selections) => boolean)(c));
      if (combos.length > 24) combos = shuffled(combos).slice(0, 24);
    }

    const productTone = Math.floor(rng() * TONE_COUNT);
    const colors = [...new Set(combos.map((c) => c.color).filter((c): c is string => Boolean(c)))];
    const tones = colorTones(colors, productTone);
    const typeCode = type.slug.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
    const variants: SeedVariant[] = combos.map((selections, j) => {
      const delta = Object.entries(selections).reduce((sum, [key, value]) => sum + (type.deltas?.[key]?.[value] ?? 0) * 100, 0);
      const price = base + delta;
      const list = onSale ? Math.ceil((price * saleFactor) / 100) * 100 - 1 : null;
      return {
        id: Object.keys(selections).length === 0 ? `var-${slug}` : `${slug}-${j + 1}`,
        sku: `CT-${typeCode}-${String(index + 1).padStart(5, "0")}-${String(j + 1).padStart(2, "0")}`,
        label: labelOf(selections, dims),
        selections,
        price,
        list,
        stock: stockFor(),
        tone: selections.color ? (tones.get(selections.color) as number) : productTone,
      };
    });

    const { attributes, specs } = buildAttributes(type, brand, [mod, size], pick, rng);
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
      typeSlug: type.slug,
      shape: type.shape,
      rating,
      count,
      created,
      description: `${pick(type.blurbs)} ${extra}. ${pick(type.uses)}`,
      bullets: features.slice(0, bulletCount),
      attributes,
      specs,
      optionName: combos.length > 0 && Object.keys(combos[0]).length > 0 ? dims.map((d) => d.label).join(" / ") : null,
      variants,
    });
  }
  return out;
}
