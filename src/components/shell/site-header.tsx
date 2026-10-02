import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/auth-actions";
import { readActor, readUser } from "@/server/session";
import { getApp } from "@/server/runtime";
import { MobileMenu } from "./mobile-menu";
import { SearchBar } from "./search-bar";

async function headerData() {
  const app = await getApp();
  const [actor, user] = await Promise.all([readActor(), readUser()]);
  const [categories, cart] = await Promise.all([
    app.catalog.listCategories(),
    actor ? app.cart.getCart(actor) : Promise.resolve(null),
  ]);
  return { categories, count: cart?.itemCount ?? 0, user };
}

/**
 * Light header with a hairline. Search is the centre of the header; the cart sits right.
 * Small screens: menu, wordmark and cart on one row, search on its own row, a scrolling category strip below.
 */
export async function SiteHeader() {
  const { categories, count, user } = await headerData();
  const strip = "flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground";
  return (
    <header className="border-b bg-background">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:grid-cols-[auto_minmax(0,36rem)_auto] lg:justify-between lg:px-8">
        <div className="flex items-center gap-1">
          <MobileMenu categories={categories} userName={user?.name ?? null} />
          <Link href="/" className="flex min-h-11 items-center text-xl font-semibold tracking-tight">
            Cartly
          </Link>
        </div>
        <div className="order-last col-span-3 lg:order-none lg:col-span-1">
          <SearchBar />
        </div>
        <div className="flex items-center gap-1">
        <nav aria-label="Account" className="hidden items-center gap-1 lg:flex">
          {user ? (
            <>
              <Link href="/orders" className={strip}>
                Orders
              </Link>
              <form action={signOutAction}>
                <button type="submit" className={`${strip} cursor-pointer`}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className={strip}>
              Sign in
            </Link>
          )}
        </nav>
        <Link
          href="/cart"
          className="relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium"
        >
          <ShoppingBag aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">Cart</span>
          {count > 0 ? (
            <span aria-hidden="true" className="num grid h-5 min-w-5 place-items-center rounded-md bg-primary px-1 text-xs font-medium text-primary-foreground">
              {count}
            </span>
          ) : null}
          <span className="sr-only">
            , {count} {count === 1 ? "item" : "items"} in cart
          </span>
        </Link>
        </div>
      </div>
      <nav aria-label="Categories" className="mx-auto max-w-[1280px] px-2 sm:px-4 lg:px-6">
        <ul className="scrollbar-none flex overflow-x-auto">
          <li>
            <Link href="/s" className={strip}>
              All
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/s?c=${c.slug}`} className={strip}>
                {c.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/s?sale=1" className={strip}>
              On sale
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
