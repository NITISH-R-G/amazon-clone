import type { ProductSpec } from "@/modules/catalog";

/** Technical details as a plain two-column list with hairlines (no card, no zebra). */
export function ProductSpecs({ specs }: { specs: ProductSpec[] }) {
  if (specs.length === 0) return null;
  return (
    <section aria-labelledby="specs" className="space-y-3">
      <h2 id="specs" className="text-sm font-semibold">
        Technical details
      </h2>
      <dl className="divide-y border-y text-[15px]">
        {specs.map((s) => (
          <div key={s.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5">
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
