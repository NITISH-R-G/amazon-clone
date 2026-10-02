"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Props = { categories: { slug: string; name: string }[] };

/** Navigation sheet for small screens. */
export function MobileMenu({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const linkClass = "flex min-h-11 items-center rounded-md px-3 text-base font-medium hover:bg-muted";
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,22rem)] gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-lg">Shop</SheetTitle>
        </SheetHeader>
        <nav aria-label="Categories" className="flex flex-col p-2">
          <Link href="/s" onClick={close} className={linkClass}>
            All products
          </Link>
          <Link href="/s?sale=1" onClick={close} className={linkClass}>
            On sale
          </Link>
          <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">Categories</p>
          {categories.map((c) => (
            <Link key={c.slug} href={`/s?c=${c.slug}`} onClick={close} className={linkClass}>
              {c.name}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
