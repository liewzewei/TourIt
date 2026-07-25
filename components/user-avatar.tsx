"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { User, UserCircle, LogOut, ArrowRightIcon } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ThemeControls from "@/components/theme-controls";

import createClient from "@/lib/supabase/client";
import useUser from "@/hooks/useUser";
import { LOGIN_PATH } from "@/constants/common";

export default function UserAvatar() {
  const { user, profile, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  // Hide entirely on the login page
  if (pathname === LOGIN_PATH) return null;
  if (loading) return null;

  // Not logged in -> show Login button (same as old AuthButton)
  if (!user) {
    return (
      <Button className="group" asChild>
        <Link href={LOGIN_PATH}>
          <span>Login</span>
          <ArrowRightIcon
            className="opacity-60 transition-transform group-hover:translate-x-0.5"
            size={16}
            aria-hidden="true"
          />
        </Link>
      </Button>
    );
  }

  // Fallback chain: profiles table -> Google OAuth metadata -> default
  const displayName =
    profile?.display_name || user.user_metadata?.full_name || "User";
  const email = user.email || "";
  const avatarUrl =
    profile?.avatar_url || user.user_metadata?.avatar_url || null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(LOGIN_PATH);
    router.refresh();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div className="relative group">
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
            aria-label="Account menu"
          >
            <Avatar>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        {/* Hover tooltip — hides when dropdown is open */}
        <span
          className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded text-xs text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
            open ? "!opacity-0" : ""
          }`}
        >
          Account settings
        </span>
      </div>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold leading-none">{displayName}</p>
            <p className="text-xs text-muted-foreground leading-none">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex items-center gap-2">
            <UserCircle className="size-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Plain buttons (not menu items), so switching theme/palette doesn't
            close the menu. */}
        <div className="px-2 py-1.5">
          <ThemeControls />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}