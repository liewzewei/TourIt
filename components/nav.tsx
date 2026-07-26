"use client";

import Link from "next/link";

import { Menu, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import AuthButton from "@/components/auth-buttons";
import NavLink from "@/components/nav-link";
import UserAvatar from "@/components/user-avatar";

import useUser from "@/hooks/useUser";
import useScrolledPast from "@/hooks/useScrolledPast";
import { cn } from "@/lib/utils";
import { ROLE_HOME_PATH } from "@/constants/common";
import { MenuItem } from "@/types/index";

const ROLE_NAV_MENU_ITEMS: Record<string, MenuItem[]> = {
    tourist: [
        { title: "Explore", url: "/tourist/explore" },
        { title: "Itineraries", url: "/tourist/itineraries" },
    ],
    business_owner: [
        { title: "Home", url: ROLE_HOME_PATH.business_owner, exact: true },
        { title: "Listings", url: "/business-owner/listings" },
        { title: "Insights", url: "/business-owner/analytics" },
    ],
};

// Half the bar's height (h-16 = 64px). Past this the in-flow top bar has scrolled
// out and the floating island drops in.
const ISLAND_THRESHOLD = 32;

export default function Nav() {
  // useUser gets the data from the UserContext, which is populated in the root layout
  const { profile } = useUser();

  const items = profile?.role ? ROLE_NAV_MENU_ITEMS[profile.role] || [] : [];

  const scrolled = useScrolledPast(ISLAND_THRESHOLD);

  return (
    <>
      {/* Top bar -- in normal flow, so it simply scrolls away with the page.
          `inert` once the island takes over, so only one nav is interactive. */}
      <section inert={scrolled} className="border-b bg-background">
        <div className="container mx-auto px-6">
          <NavBar items={items} />
        </div>
      </section>

      {/* Dynamic island -- fixed; drops in from above (and slides back up) as the
          top bar passes half its height. Frosted, rounded, and inert while
          hidden so it stays out of the tab order at the top of the page. */}
      <div
        inert={!scrolled}
        className={cn(
          "fixed inset-x-0 top-3 z-40 px-4 transition-all duration-300 ease-[var(--ease-out-back)] motion-reduce:transition-none",
          scrolled
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-[150%] opacity-0"
        )}
      >
        <div className="container mx-auto">
          <div className="rounded-2xl border bg-background/70 px-6 shadow-lifted backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <NavBar items={items} />
          </div>
        </div>
      </div>
    </>
  );
}

// The bar's contents, shared by the top bar and the island. The desktop row is a
// 1fr/auto/1fr grid (logo left, links dead-centre, avatar right); the full-height
// cells let each NavLink anchor its active underline to the bar's bottom edge.
function NavBar({ items }: { items: MenuItem[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden h-16 grid-cols-[1fr_auto_1fr] items-stretch lg:grid">
        <div className="flex items-center">
          <Logo />
        </div>

        <NavigationMenu viewport={false} className="h-full max-w-none items-stretch">
          <NavigationMenuList className="h-full items-stretch gap-1">
            {items.map((item) => (
              <NavigationMenuItem key={item.title} className="flex">
                <NavLink href={item.url} exact={item.exact}>
                  {item.title}
                </NavLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center justify-end">
          <UserAvatar />
        </div>
      </div>

      {/* Mobile */}
      <div className="flex items-center justify-between py-4 lg:hidden">
        <Logo />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 p-4">
              {items.map((item) => (
                <NavLink
                  key={item.title}
                  href={item.url}
                  exact={item.exact}
                  variant="mobile"
                >
                  {item.title}
                </NavLink>
              ))}

              <AuthButton />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Sparkle className="size-5" />
      <span className="text-lg font-semibold tracking-tighter">TourIt</span>
    </Link>
  );
};
