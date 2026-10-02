import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:flex-row md:justify-between lg:px-8">
        <p className="max-w-md">Cartly is a demo store. Payments are simulated: no card is charged and no real order is placed.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/s" className="hover:text-foreground">
            All products
          </Link>
          <Link href="/s?sale=1" className="hover:text-foreground">
            On sale
          </Link>
          <Link href="/cart" className="hover:text-foreground">
            Cart
          </Link>
        </nav>
      </div>
    </footer>
  );
}
