import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// A back-navigation link: an arrow plus a label, in muted ink that firms up on
// hover. On hover only the arrow scales up (no underline). Shared so every
// "return to page" control reads and behaves the same.
export default function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground hover:no-underline"
    >
      <ArrowLeft
        className="size-4 transition-transform group-hover:scale-125"
        aria-hidden
      />
      {children}
    </Link>
  );
}
