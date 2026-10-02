"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
] as const;

/** Sort select; the choice is a URL parameter (page resets to 1). */
export function SortControl({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <Label htmlFor="sort" className="text-sm text-muted-foreground">
        Sort
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          const p = new URLSearchParams(params.toString());
          if (next === "featured") p.delete("sort");
          else p.set("sort", next);
          p.delete("page");
          startTransition(() => router.push(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false }));
        }}
      >
        <SelectTrigger id="sort" className="min-w-0 flex-1 sm:min-w-44 sm:flex-none" aria-busy={pending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
