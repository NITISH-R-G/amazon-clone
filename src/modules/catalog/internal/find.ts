import { and, asc, count, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { attributeDefs, categories, productTypes, products, variants } from "../schema";
import type { AttributeFacet, BrandCount, CategoryCount, Product, ProductCriteria, ProductPage, TextMatch, TypeCount } from "../types";

const MAX_TOKENS = 8;
const MAX_TOKEN_LENGTH = 32;
const MAX_PAGE_SIZE = 100;
const BRAND_FACET_LIMIT = 12;

// `products.search` is a generated tsvector (migration 0007), so it is not in the Drizzle schema.
const SEARCH = sql.raw('"products"."search"');
const MIN_PRICE = sql`(select min(${variants.priceCents}) from ${variants} where ${variants.productId} = ${products.id})`;

/** Plural to singular, so "speakers" finds "speaker" (prefix matching handles the reverse). */
const stem = (token: string) => (token.length > 3 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token);

/** Defensive: only letters and digits reach the tsquery, whatever the caller sent. */
function cleanTokens(tokens: string[]): string[] {
  return tokens
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, MAX_TOKEN_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
}

function tokenPredicate(token: string, mode: TextMatch["mode"], includeCategoryName: boolean): SQL {
  const stemmed = stem(token);
  const parts: SQL[] = [sql`${SEARCH} @@ to_tsquery('simple', ${`${stemmed}:*`})`];
  if (includeCategoryName) parts.push(sql`lower(${categories.name}) like ${`${stemmed}%`}`);
  if (mode === "fuzzy" && token.length >= 4) {
    // `<%` is word similarity against the title/brand, served by the trigram indexes (threshold set in findProducts).
    parts.push(sql`${token} <% ${products.title}`);
    parts.push(sql`${token} <% ${products.brand}`);
  }
  return sql`(${sql.join(parts, sql` or `)})`;
}

function textCondition(text: TextMatch): SQL | undefined {
  const tokens = cleanTokens(text.tokens);
  if (tokens.length === 0) return sql`false`;
  const includeCategory = text.includeCategoryName !== false;
  const predicates = tokens.map((t) => tokenPredicate(t, text.mode, includeCategory));
  if (text.mode !== "partial" || tokens.length === 1) return and(...predicates);
  const matched = sql.join(
    predicates.map((p) => sql`(case when ${p} then 1 else 0 end)`),
    sql` + `,
  );
  return sql`(${matched}) >= ${Math.ceil(tokens.length / 2)}`;
}

/** Title words rank above brand, then description; a matching category name adds a little; typos add similarity. */
function relevance(text: TextMatch): SQL {
  const tokens = cleanTokens(text.tokens);
  if (tokens.length === 0) return sql`0`;
  const query = tokens.map((t) => `${stem(t)}:*`).join(text.mode === "partial" ? " | " : " & ");
  const parts: SQL[] = [sql`ts_rank_cd('{0.1, 0.2, 0.4, 1.0}'::float4[], ${SEARCH}, to_tsquery('simple', ${query}))`];
  if (text.includeCategoryName !== false) {
    for (const t of tokens) parts.push(sql`(case when lower(${categories.name}) like ${`${stem(t)}%`} then 0.3 else 0 end)`);
  }
  if (text.mode === "fuzzy") {
    for (const t of tokens.filter((x) => x.length >= 4)) parts.push(sql`(0.5 * word_similarity(${t}, ${products.title}))`);
  }
  return sql`(${sql.join(parts, sql` + `)})`;
}

type Filters = Omit<ProductCriteria, "sort" | "page" | "pageSize">;

/**
 * All filters except the ones named in `skip` (facets ignore their own filter).
 * `textIds`: product ids already matched by a fuzzy text query, so the trigram scan runs once, not once per query.
 */
type Scope = {
  /** undefined: no type asked for; null: a type slug that does not exist (nothing matches). */
  typeId?: string | null;
  /** The facet attribute keys of that type: the only attribute filters that are honoured. */
  facetKeys: Set<string>;
  textIds?: string[];
};
type Skip = { category?: boolean; brand?: boolean; type?: boolean; attribute?: string };

function conditions(f: Filters, scope: Scope, skip: Skip = {}): SQL[] {
  const out: SQL[] = [];
  const { textIds } = scope;
  if (textIds) out.push(textIds.length > 0 ? inArray(products.id, textIds) : sql`false`);
  else if (f.text) {
    const text = textCondition(f.text);
    if (text) out.push(text);
  }
  if (!skip.category && f.categorySlug) out.push(eq(categories.slug, f.categorySlug));
  if (!skip.brand && f.brands && f.brands.length > 0) out.push(inArray(products.brand, f.brands));
  if (!skip.type && scope.typeId !== undefined) {
    out.push(scope.typeId === null ? sql`false` : eq(products.typeId, scope.typeId));
    // Attribute filters belong to the type: they only apply while the type does.
    for (const [key, values] of Object.entries(f.attributes ?? {})) {
      if (!scope.facetKeys.has(key) || skip.attribute === key || values.length === 0) continue;
      out.push(sql`(${products.attributes} ->> ${key}) in (${sql.join(values.map((v) => sql`${v}`), sql`, `)})`);
    }
  }
  if (f.minPriceCents !== undefined) out.push(sql`${MIN_PRICE} >= ${f.minPriceCents}`);
  if (f.maxPriceCents !== undefined) out.push(sql`${MIN_PRICE} <= ${f.maxPriceCents}`);
  if (f.minRating !== undefined) out.push(gte(products.ratingTenths, Math.round(f.minRating * 10)));
  if (f.inStockOnly) {
    out.push(sql`exists (select 1 from ${variants} where ${variants.productId} = ${products.id} and ${variants.stock} > 0)`);
  }
  if (f.onSale) {
    out.push(
      sql`exists (select 1 from ${variants} where ${variants.productId} = ${products.id} and ${variants.listPriceCents} > ${variants.priceCents})`,
    );
  }
  return out;
}

function ordering(criteria: ProductCriteria): SQL[] {
  const byTitle = asc(products.title);
  const featured = sql`${products.featuredRank} asc nulls last`;
  switch (criteria.sort) {
    case "price-asc":
      return [sql`${MIN_PRICE} asc`, byTitle];
    case "price-desc":
      return [sql`${MIN_PRICE} desc`, byTitle];
    case "rating":
      return [desc(products.ratingTenths), desc(products.ratingCount), byTitle];
    case "newest":
      return [desc(products.createdAt), byTitle];
    case "relevance":
      return [
        criteria.text ? sql`${relevance(criteria.text)} desc` : sql`0`,
        featured,
        desc(products.ratingCount),
        byTitle,
      ];
    default:
      return [featured, byTitle];
  }
}

/** Word-similarity threshold for misspellings: "speker" scores 0.50 against "Speaker", "kettel" 0.57 against "Kettle". */
const SIMILARITY_THRESHOLD = "0.5";

export function createFind({ db }: { db: DbOrTx }) {
  /** Page of products with the counts needed for facets. One indexed query per concern; no full-catalogue loads. */
  return async function findProducts(criteria: ProductCriteria, tx?: DbOrTx): Promise<ProductPage> {
    const d0 = tx ?? db;
    // The threshold is transaction-local, so it never leaks into other requests on a pooled connection.
    if (criteria.text?.mode === "fuzzy") {
      return d0.transaction(async (t) => {
        await t.execute(sql`select set_config('pg_trgm.word_similarity_threshold', ${SIMILARITY_THRESHOLD}, true)`);
        return query(t, criteria);
      });
    }
    return query(d0, criteria);
  };

  async function query(d: DbOrTx, criteria: ProductCriteria): Promise<ProductPage> {
    const withFacets = criteria.withFacets !== false;
    const pageSize = Math.min(Math.max(1, Math.floor(criteria.pageSize)), MAX_PAGE_SIZE);
    const base = d.select({ id: products.id }).from(products).leftJoin(categories, eq(products.categoryId, categories.id));

    // The type, if one is asked for, and its facet attributes (the only ones a filter may name).
    let typeId: string | null | undefined;
    let facetDefs: { key: string; label: string; values: string[] }[] = [];
    if (criteria.typeSlug) {
      const [type] = await d.select({ id: productTypes.id }).from(productTypes).where(eq(productTypes.slug, criteria.typeSlug)).limit(1);
      typeId = type?.id ?? null;
      if (type) {
        facetDefs = await d
          .select({ key: attributeDefs.key, label: attributeDefs.label, values: attributeDefs.values })
          .from(attributeDefs)
          .where(and(eq(attributeDefs.typeId, type.id), eq(attributeDefs.facet, true), eq(attributeDefs.role, "spec")))
          .orderBy(asc(attributeDefs.position));
      }
    }
    const scope: Scope = { typeId, facetKeys: new Set(facetDefs.map((f) => f.key)) };

    if (criteria.text && criteria.text.mode !== "all") {
      const matched = await base.where(textCondition(criteria.text));
      scope.textIds = matched.map((r) => r.id);
    }

    const where = and(...conditions(criteria, scope));
    const [{ total }] = await d
      .select({ total: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where);

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, Math.floor(criteria.page)), pageCount);

    const [idRows, categoryRows, brandRows, typeRows, attributeRows] = await Promise.all([
      total === 0
        ? Promise.resolve([] as { id: string }[])
        : base
            .where(where)
            .orderBy(...ordering(criteria))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
      withFacets
        ? d
            .select({ slug: categories.slug, name: categories.name, count: count() })
            .from(products)
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(and(...conditions(criteria, scope, { category: true })))
            .groupBy(categories.slug, categories.name, categories.position)
            .orderBy(asc(categories.position), asc(categories.name))
        : Promise.resolve([] as { slug: string; name: string; count: number }[]),
      withFacets
        ? d
            .select({ name: products.brand, count: count() })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(...conditions(criteria, scope, { brand: true })))
            .groupBy(products.brand)
            .orderBy(desc(count()), asc(products.brand))
            .limit(BRAND_FACET_LIMIT)
        : Promise.resolve([] as { name: string; count: number }[]),
      withFacets
        ? d
            .select({ slug: productTypes.slug, name: productTypes.name, count: count() })
            .from(products)
            .innerJoin(productTypes, eq(products.typeId, productTypes.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(...conditions(criteria, scope, { type: true })))
            .groupBy(productTypes.slug, productTypes.name, productTypes.position)
            .orderBy(asc(productTypes.position))
        : Promise.resolve([] as { slug: string; name: string; count: number }[]),
      // One grouped count per facet attribute of the type, each ignoring its own filter.
      withFacets && typeId
        ? Promise.all(
            facetDefs.map(async (def) => {
              const value = sql<string>`(${products.attributes} ->> ${def.key})`;
              const rows = await d
                .select({ value, count: count() })
                .from(products)
                .leftJoin(categories, eq(products.categoryId, categories.id))
                .where(and(...conditions(criteria, scope, { attribute: def.key }), sql`${value} is not null`))
                .groupBy(sql`1`); // by position: the same key bound twice would be two different expressions
              return { def, counts: new Map(rows.map((r) => [r.value, Number(r.count)])) };
            }),
          )
        : Promise.resolve([] as { def: { key: string; label: string; values: string[] }; counts: Map<string, number> }[]),
    ]);

    const ids = idRows.map((r) => r.id);
    let items: Product[] = [];
    if (ids.length > 0) {
      const [rows, variantRows] = await Promise.all([
        d.select().from(products).where(inArray(products.id, ids)),
        d.select().from(variants).where(inArray(variants.productId, ids)).orderBy(asc(variants.id)),
      ]);
      const byId = new Map(rows.map((r) => [r.id, r]));
      items = ids.flatMap((id) => {
        const row = byId.get(id);
        if (!row) return [];
        const { ratingTenths, ...rest } = row;
        return [{ ...rest, rating: ratingTenths / 10, variants: variantRows.filter((v) => v.productId === id) } as Product];
      });
    }

    const toCategory = (r: { slug: string; name: string; count: number }): CategoryCount => ({ slug: r.slug, name: r.name, count: Number(r.count) });
    const toBrand = (r: { name: string; count: number }): BrandCount => ({ name: r.name, count: Number(r.count) });
    const toType = (r: { slug: string; name: string; count: number }): TypeCount => ({ slug: r.slug, name: r.name, count: Number(r.count) });
    const attributes: AttributeFacet[] = attributeRows
      .map(({ def, counts }) => {
        const selected = criteria.attributes?.[def.key] ?? [];
        // Vocabulary order; a value with no products is shown only when it is selected (so it can be removed).
        const values = def.values
          .map((value) => ({ value, count: counts.get(value) ?? 0 }))
          .filter((v) => v.count > 0 || selected.includes(v.value));
        return { key: def.key, label: def.label, values };
      })
      .filter((f) => f.values.length > 0);
    return {
      products: items,
      total: Number(total),
      page,
      facets: { categories: categoryRows.map(toCategory), brands: brandRows.map(toBrand), types: typeRows.map(toType), attributes },
    };
  }
}
