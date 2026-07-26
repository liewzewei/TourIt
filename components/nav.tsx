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

export default function Nav() {

  // useUser gets the data from the UserContext, which is populated in the root layout
  const { profile } = useUser();

  const NAV_MENU_ITEMS = profile?.role
    ? ROLE_NAV_MENU_ITEMS[profile.role] || []
    : [];

  return (
    // The bottom border is the line the desktop active/hover underline sits on,
    // so vertical padding lives on the rows below (not the section) -- that lets
    // each desktop link stretch full-height and anchor its underline to it.
    <section className="border-b px-4">
      <div className="container mx-auto">
        {/* Desktop Menu -- three columns (1fr / auto / 1fr) so the links sit
            dead-centre regardless of the logo and avatar widths; the logo stays
            pinned left and the avatar right. */}
        <div className="hidden h-16 grid-cols-[1fr_auto_1fr] items-stretch lg:grid">
          <div className="flex items-center">
            <Logo />
          </div>

          <NavigationMenu viewport={false} className="h-full max-w-none items-stretch">
            <NavigationMenuList className="h-full items-stretch gap-1">
              {NAV_MENU_ITEMS.map((item) => (
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

        {/* Mobile Menu */}
        <div className="block py-4 lg:hidden">
          <div className="flex items-center justify-between">
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
                  {NAV_MENU_ITEMS.map((item) => (
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
        </div>
      </div>
    </section>
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
