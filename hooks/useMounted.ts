"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the hydration render, true once mounted on the client --
 * a mount gate built on useSyncExternalStore so it avoids a setState-in-effect.
 * Use it to defer rendering values that only exist on the client (e.g. the
 * next-themes active mode) until after hydration.
 */
export default function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
