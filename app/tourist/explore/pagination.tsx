import Link from "next/link";

// Pure server component: just links, no client JS. The parent supplies a
// `buildHref` that preserves any other query params (filters land in Phase 3).
export default function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  // One page (or none) — nothing to page through.
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const enabled =
    "px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition";
  const disabled =
    "px-4 py-2 text-sm font-medium border rounded-md opacity-40 cursor-not-allowed select-none";

  return (
    <nav
      className="flex items-center justify-center gap-4 mt-10"
      aria-label="Pagination"
    >
      {hasPrev ? (
        <Link href={buildHref(currentPage - 1)} rel="prev" className={enabled}>
          ← Previous
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          ← Previous
        </span>
      )}

      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>

      {hasNext ? (
        <Link href={buildHref(currentPage + 1)} rel="next" className={enabled}>
          Next →
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          Next →
        </span>
      )}
    </nav>
  );
}
