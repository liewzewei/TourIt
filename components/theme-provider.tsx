"use client";

import type { ComponentProps } from "react";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Thin client wrapper so the root layout (a server component) can mount
// next-themes. Manages only the light/dark class axis; the palette axis lives in
// PaletteProvider.
export default function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>
) {
  return <NextThemesProvider {...props} />;
}
