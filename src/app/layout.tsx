import type { Metadata } from "next";
import { Hanken_Grotesk, Public_Sans } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { cn } from "@/lib/utils";

// Primary face and its fallback (D20). Public Sans is not preloaded: it only renders if Hanken fails.
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Cartly", template: "%s | Cartly" },
  description: "A demo storefront: product, cart, checkout and order confirmation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full bg-background font-sans antialiased", hanken.variable, publicSans.variable)}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
