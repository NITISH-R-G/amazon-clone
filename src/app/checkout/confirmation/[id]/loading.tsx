export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4" aria-busy="true" aria-label="Loading your order">
      <div className="h-24 rounded-lg bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
