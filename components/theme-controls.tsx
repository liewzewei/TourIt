"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePalette } from "@/context/palette-context";
import useMounted from "@/hooks/useMounted";
import { PALETTES } from "@/lib/palettes";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * The theme (light/dark/system) + palette switcher. Shared by the nav account
 * dropdown and the settings page. The mode buttons are mount-gated -- next-themes
 * has no theme on the server, so the active state only paints after hydration to
 * avoid a mismatch. The palette comes from context (seeded server-side), so its
 * active state is stable across SSR and needs no gate.
 */
export default function ThemeControls({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const mounted = useMounted();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Theme</span>
        <div
          role="group"
          aria-label="Theme"
          className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1"
        >
          {MODES.map(({ value, label, icon: Icon }) => {
            const active = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-raised"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Palette
        </span>
        <div role="group" aria-label="Palette" className="flex gap-2">
          {PALETTES.map((p) => {
            const active = palette === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPalette(p.value)}
                aria-pressed={active}
                aria-label={p.label}
                title={p.label}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border transition-transform hover:scale-110",
                  active ? "border-ring ring-2 ring-ring/50" : "border-border"
                )}
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full"
                  style={{ background: p.swatch }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
