// Streamed skeleton shown while the analytics RPCs resolve.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-9 w-32 animate-pulse rounded bg-gray-100" />
        <div className="h-9 w-48 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border bg-gray-50"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-gray-50" />
    </main>
  );
}
