"use client";

import Link from "next/link";

import { Menu, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
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
        { title: "Home", url: ROLE_HOME_PATH.business_owner },
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
    <section className="p-4 border-b">
      <div className="container mx-auto">
        {/* Desktop Menu */}
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {NAV_MENU_ITEMS.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          <UserAvatar />
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden">
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
                <div className="flex flex-col gap-6 p-4">
                  {NAV_MENU_ITEMS.map((item) => renderMobileMenuItem(item))}

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

const renderMenuItem = (item: MenuItem) => {
  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink
        href={item.url}
        className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground"
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  return (
    <Link key={item.title} href={item.url} className="text-md font-semibold">
      {item.title}
    </Link>
  );
};