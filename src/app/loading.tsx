import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-16" aria-busy="true" aria-label="Loading">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-12 w-44" />
        </div>
        <Skeleton className="aspect-[5/4] w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
