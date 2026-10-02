"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterControls } from "./filter-controls";

type Props = {
  categories: { slug: string; name: string; count: number }[];
  brands: { name: string; count: number }[];
  types: { slug: string; name: string; count: number }[];
  attributes: { key: string; label: string; values: { value: string; count: number }[] }[];
  total: number;
  activeCount: number;
};

/** Filters in a bottom sheet for small screens; same controls and URL state as the desktop sidebar. */
export function MobileFilters({ categories, brands, types, attributes, total, activeCount }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal aria-hidden="true" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] gap-0 rounded-t-xl p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-lg">Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <FilterControls categories={categories} brands={brands} types={types} attributes={attributes} />
        </div>
        <SheetFooter className="border-t p-4">
          <Button size="lg" className="w-full" onClick={() => setOpen(false)}>
            Show {total} {total === 1 ? "product" : "products"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
