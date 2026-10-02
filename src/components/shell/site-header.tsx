import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { readGuestActor } from "@/server/guest";
import { getApp } from "@/server/runtime";

async function cartCount(): Promise<number> {
  const actor = await readGuestActor();
  if (!actor) return 0;
  const app = await getApp();
  return (await app.cart.getCart(actor)).itemCount;
}

export async function SiteHeader() {
  const count = await cartCount();
  return (
    <header className="bg-header text-header-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true" className="inline-block size-3 rounded-full bg-primary" />
          Cartly
        </Link>
        <Link
          href="/cart"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-offset-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ShoppingCart aria-hidden="true" className="size-5" />
          <span className="text-sm font-medium">Cart</span>
          <span
            aria-hidden="true"
            className="min-w-6 rounded-full bg-primary px-1.5 py-0.5 text-center text-xs font-bold text-primary-foreground"
          >
            {count}
          </span>
          <span className="sr-only">
            , {count} {count === 1 ? "item" : "items"} in cart
          </span>
        </Link>
      </div>
    </header>
  );
}
