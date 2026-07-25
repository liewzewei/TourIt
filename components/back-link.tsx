import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// A back-navigation link: a nudging arrow plus a label, in muted ink that
// firms up on hover. Shared so "back to the feed" reads the same everywhere.
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
      className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft
        className="size-4 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      {children}
    </Link>
  );
}
