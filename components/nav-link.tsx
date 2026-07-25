"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A nav item is active when the current path is the item's href or a descendant
 * of it (so listing detail pages keep "Explore" lit). `exact` opts out of the
 * descendant match -- needed for a role home like `/business-owner`, which is a
 * prefix of its siblings and would otherwise stay lit on every owner page.
 */
function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavLinkProps = {
  href: string;
  children: ReactNode;
  exact?: boolean;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

/**
 * Shared nav link that owns its own active state via `usePathname()`, so the
 * indicator exists in both the desktop bar and the mobile Sheet for free.
 *
 * Desktop renders a full-height cell: the text pill shades + scales on
 * hover/active (scale, not font-size, so neighbours don't shift), and an accent
 * bar sits on the nav's bottom border and thickens -- so the border reads as
 * thickening under the current section. Motion is transform-only, so the global
 * reduced-motion rule flattens it to an instant state change.
 */
export default function NavLink({
  href,
  children,
  exact,
  variant = "desktop",
  onNavigate,
}: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        data-active={active || undefined}
        className="group/navlink flex items-center rounded-md px-3 py-2 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground"
      >
        <span className="inline-block origin-left transition-transform group-hover/navlink:scale-105 group-data-active/navlink:scale-105">
          {children}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-active={active || undefined}
      className="group/navlink relative flex h-full items-center px-4 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 data-active:bg-muted/60 data-active:text-foreground"
    >
      {/* Shade fills the whole cell (top of the bar to the bottom border); only
          the text scales, so neighbours don't shift. */}
      <span className="transition-transform group-hover/navlink:scale-105 group-data-active/navlink:scale-105">
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-bottom scale-y-0 bg-primary/70 transition-all group-hover/navlink:scale-y-100 group-data-active/navlink:h-[3px] group-data-active/navlink:scale-y-100 group-data-active/navlink:bg-primary"
      />
    </Link>
  );
}
