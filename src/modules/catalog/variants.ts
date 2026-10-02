// Pure variant logic: no database, no I/O. Importable from client components as "@/modules/catalog/variants".
// A variant is one purchasable combination of the product's variation dimensions (colour, storage, RAM, size...).

export type Selections = Record<string, string>;

export type VariantLike = { id: string; selections: Selections; stock: number; priceCents: number };

/** What a type says about a dimension: its label and the order of its values. */
export type DimensionDef = { key: string; label: string; values: string[] };

export type Dimension = { key: string; label: string; values: string[] };

export type OptionState = { inStock: boolean; compatible: boolean };

const labelFromKey = (key: string) => (key.length <= 3 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1));

/**
 * The picker's dimensions: in the order the type defines them (then any others as first seen), with
 * values in the type's vocabulary order, limited to the values that some variant really has.
 */
export function dimensionsOf(variants: { selections: Selections }[], defs: DimensionDef[] = []): Dimension[] {
  const seen = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.selections)) {
      const values = seen.get(key) ?? [];
      if (!values.includes(value)) values.push(value);
      seen.set(key, values);
    }
  }
  const defByKey = new Map(defs.map((d) => [d.key, d]));
  const order = [...defs.map((d) => d.key).filter((k) => seen.has(k)), ...[...seen.keys()].filter((k) => !defByKey.has(k))];
  return order.map((key) => {
    const def = defByKey.get(key);
    const present = seen.get(key) as string[];
    const values = def
      ? [...def.values.filter((v) => present.includes(v)), ...present.filter((v) => !def.values.includes(v))]
      : present;
    return { key, label: def?.label ?? labelFromKey(key), values };
  });
}

const sameSelections = (a: Selections, b: Selections) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
};

/** The variant for a complete selection, or null when there is none (or the selection is incomplete). */
export function resolveVariant<V extends VariantLike>(variants: V[], selections: Selections): V | null {
  return variants.find((v) => sameSelections(v.selections, selections)) ?? null;
}

/**
 * The shopper changed one dimension. Pick the real variant that has the new value and keeps as many of the
 * other current choices as possible. An exact match wins even when sold out; ties prefer stock, then price.
 */
export function nearestVariant<V extends VariantLike>(
  variants: V[],
  current: Selections,
  change: { key: string; value: string },
): V | null {
  const candidates = variants.filter((v) => v.selections[change.key] === change.value);
  const kept = (v: V) => Object.entries(current).filter(([k, val]) => k !== change.key && v.selections[k] === val).length;
  return (
    [...candidates].sort((a, b) => kept(b) - kept(a) || Number(b.stock > 0) - Number(a.stock > 0) || a.priceCents - b.priceCents)[0] ?? null
  );
}

/**
 * For every value of every dimension: does any variant with it have stock, and does it fit the current choices
 * (a real variant exists that keeps the other dimensions as selected)? Incompatible values stay clickable:
 * choosing one moves the other dimensions to the nearest real variant.
 */
export function optionStates(variants: VariantLike[], current: Selections): Record<string, Record<string, OptionState>> {
  const out: Record<string, Record<string, OptionState>> = {};
  for (const dimension of dimensionsOf(variants)) {
    out[dimension.key] = {};
    for (const value of dimension.values) {
      const withValue = variants.filter((v) => v.selections[dimension.key] === value);
      out[dimension.key][value] = {
        inStock: withValue.some((v) => v.stock > 0),
        compatible: withValue.some((v) =>
          Object.entries(current).every(([k, val]) => k === dimension.key || v.selections[k] === val),
        ),
      };
    }
  }
  return out;
}

/** "Black, 256 GB, 8 GB": the selections in dimension order, or null for a product without variations. */
export function variantLabel(selections: Selections, dimensions: Dimension[]): string | null {
  const parts = dimensions.map((d) => selections[d.key]).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
