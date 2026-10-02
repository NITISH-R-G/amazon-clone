export default function Loading() {
  return (
    <div
      className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_20rem]"
      aria-busy="true"
      aria-label="Loading product"
    >
      <div className="aspect-square rounded-lg bg-muted" />
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-3/4 rounded bg-muted" />
        <div className="h-10 w-32 rounded bg-muted" />
        <div className="h-24 rounded bg-muted" />
      </div>
      <div className="h-56 rounded-lg bg-muted" />
    </div>
  );
}
