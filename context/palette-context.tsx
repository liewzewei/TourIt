"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  PALETTE_COOKIE,
  type PaletteValue,
} from "@/lib/palettes";

type PaletteContextValue = {
  palette: PaletteValue;
  setPalette: (palette: PaletteValue) => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

/**
 * Holds the active palette, seeded from the server-read cookie so the first
 * client render already matches the SSR `data-palette` (no flash, no mount
 * gate). `setPalette` updates the <html> attribute and the cookie in place, so
 * the change is instant and survives a reload / SSR nav.
 */
export function PaletteProvider({
  initialPalette,
  children,
}: {
  initialPalette: PaletteValue;
  children: ReactNode;
}) {
  const [palette, setPaletteState] = useState<PaletteValue>(initialPalette);

  const setPalette = useCallback((next: PaletteValue) => {
    setPaletteState(next);
    document.documentElement.dataset.palette = next;
    // A year, root path, lax -- the root layout reads it back on every request.
    document.cookie = `${PALETTE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within a PaletteProvider");
  return ctx;
}
