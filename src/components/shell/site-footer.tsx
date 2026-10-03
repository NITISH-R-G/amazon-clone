import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:flex-row md:justify-between lg:px-8">
        <p className="max-w-md">Cartly is a demo store. Payments use Stripe test mode. No real card is charged.</p>
        <nav aria-label="Footer" className="-mx-2 flex flex-wrap">
          <Link href="/s" className="flex min-h-11 items-center px-2 hover:text-foreground pointer-fine:min-h-9 md:px-3">
            All products
          </Link>
          <Link href="/s?sale=1" className="flex min-h-11 items-center px-2 hover:text-foreground pointer-fine:min-h-9 md:px-3">
            On sale
          </Link>
          <Link href="/cart" className="flex min-h-11 items-center px-2 hover:text-foreground pointer-fine:min-h-9 md:px-3">
            Cart
          </Link>
        </nav>
      </div>
    </footer>
  );
}
