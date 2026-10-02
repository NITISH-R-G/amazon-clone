import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">We could not find that page</h1>
      <p className="text-muted-foreground">The link may be old, or the item is no longer available.</p>
      <Button asChild>
        <Link href="/">Back to shop</Link>
      </Button>
    </div>
  );
}
