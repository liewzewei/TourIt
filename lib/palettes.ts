// The palette axis (orthogonal to light/dark). `data-palette` on <html> selects
// the block in globals.css; the value is persisted in this cookie and read
// server-side in the root layout so it never flashes and works without JS.
export const PALETTE_COOKIE = "palette";
export const DEFAULT_PALETTE = "default";

// `swatch` is a fixed colour for the picker dot (each palette's own brand hue),
// independent of the active palette -- so it can't use var(--primary).
export const PALETTES = [
  { value: "default", label: "Teal", swatch: "oklch(0.55 0.13 200)" },
  { value: "sunset", label: "Sunset", swatch: "oklch(0.62 0.15 48)" },
  { value: "grape", label: "Grape", swatch: "oklch(0.53 0.16 300)" },
] as const;

export type PaletteValue = (typeof PALETTES)[number]["value"];

export function isPaletteValue(value: string | undefined): value is PaletteValue {
  return PALETTES.some((p) => p.value === value);
}
