"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// The server has no pointer info, so the SSR/first render is the desktop popover
// picker; touch devices flip to the native field after hydration.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * True on coarse-pointer (touch) devices, via useSyncExternalStore so it stays
 * in step with `matchMedia` without a setState-in-effect. The date/time fields
 * use it to fall back to native `<input type="date"|"time">` on touch, keeping
 * the mobile wheel UX.
 */
export default function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
