"use client";

import { useSyncExternalStore } from "react";

/**
 * True once the window is scrolled more than `threshold` px from the top. Built
 * on useSyncExternalStore so it re-renders only when the boolean flips (not on
 * every scroll frame) and avoids a setState-in-effect; SSR/first render is
 * `false` (top of page).
 */
export default function useScrolledPast(threshold: number): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("scroll", onStoreChange, { passive: true });
      return () => window.removeEventListener("scroll", onStoreChange);
    },
    () => window.scrollY > threshold,
    () => false
  );
}
