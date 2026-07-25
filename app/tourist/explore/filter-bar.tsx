"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TagMultiSelect, { type Tag } from "@/components/tag-multi-select";
import { cn } from "@/lib/utils";

// Re-exported so `explore/page.tsx` keeps importing the tag shape from here.
export type { Tag };

export default function FilterBar({
  availableTags,
  initialTagIds,
  initialOpenFrom,
  initialOpenUntil,
}: {
  availableTags: Tag[];
  initialTagIds: string[];
  initialOpenFrom: string;
  initialOpenUntil: string;
}) {
  const router = useRouter();

  // Local draft state — the user builds a selection, then commits with Apply
  // (one navigation), instead of a server round trip on every keystroke/toggle.
  const [selectedTags, setSelectedTags] = useState<Tag[]>(() =>
    availableTags.filter((t) => initialTagIds.includes(t.id))
  );
  const [openFrom, setOpenFrom] = useState(initialOpenFrom);
  const [openUntil, setOpenUntil] = useState(initialOpenUntil);

  // The badge and the default-open state reflect the *applied* filters (the URL,
  // which is the source of truth), not the draft being edited -- so a closed
  // panel still tells the user why the feed is filtered.
  const appliedCount =
    initialTagIds.length +
    (initialOpenFrom ? 1 : 0) +
    (initialOpenUntil ? 1 : 0);
  const [isPanelOpen, setIsPanelOpen] = useState(appliedCount > 0);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.map((t) => t.id).join(","));
    }
    if (openFrom) params.set("open_from", openFrom);
    if (openUntil) params.set("open_until", openUntil);
    const qs = params.toString();
    // Applying filters always returns to page 1 (no page param).
    router.push(qs ? `/tourist/explore?${qs}` : "/tourist/explore");
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setOpenFrom("");
    setOpenUntil("");
    router.push("/tourist/explore");
  };

  const hasDraftFilters =
    selectedTags.length > 0 || openFrom !== "" || openUntil !== "";

  return (
    <div className="mb-8">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsPanelOpen((o) => !o)}
        aria-expanded={isPanelOpen}
      >
        <SlidersHorizontal />
        Filters
        {appliedCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {appliedCount}
          </span>
        )}
        <ChevronDown
          className={cn("transition-transform", isPanelOpen && "rotate-180")}
        />
      </Button>

      {isPanelOpen && (
        <div className="mt-4 rounded-lg border bg-muted/50 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Tag multi-select (match ANY) */}
            <TagMultiSelect
              availableTags={availableTags}
              selected={selectedTags}
              onChange={setSelectedTags}
              label="Tags"
              className="flex-1"
            />

            {/* Open during this window */}
            <div className="flex flex-col gap-2">
              <label htmlFor="open_from" className="text-sm font-medium">
                Open from
              </label>
              <Input
                type="time"
                id="open_from"
                value={openFrom}
                onChange={(e) => setOpenFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="open_until" className="text-sm font-medium">
                Open until
              </label>
              <Input
                type="time"
                id="open_until"
                value={openUntil}
                onChange={(e) => setOpenUntil(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button type="button" onClick={applyFilters}>
                Apply
              </Button>
              {hasDraftFilters && (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
