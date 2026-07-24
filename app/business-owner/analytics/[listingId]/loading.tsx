// Streamed skeleton for the per-listing drill-down.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-9 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border bg-muted"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-muted" />
    </main>
  );
}
