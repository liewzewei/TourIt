"use client";

import { useState } from "react";

import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type Tag = {
  id: string;
  tag_name: string;
  category: string;
};

type TagMultiSelectProps = {
  availableTags: Tag[];
  /** Controlled selection -- the parent owns the list. */
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  /** Label rendered above the control. */
  label?: string;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Cap on how many tags may be selected; unlimited when omitted. */
  maxSelected?: number;
  /** Fired when the user tries to select past `maxSelected`. */
  onMaxSelected?: () => void;
  /** When set, the selection is mirrored into hidden inputs of this name so the
      control submits as part of a plain <form>. */
  name?: string;
  /** Merged into the root, e.g. `flex-1` in a filter row. */
  className?: string;
};

/**
 * Tag picker shared by the explore filter and the listing form. A `maxSelected`
 * cap (with disabled styling on the over-cap options) is the only behavioural
 * difference between the two callers, so it lives here as a prop rather than
 * being reimplemented -- and drifting -- in each.
 */
export default function TagMultiSelect({
  availableTags,
  selected,
  onChange,
  label,
  placeholder = "Select tags...",
  maxSelected,
  onMaxSelected,
  name,
  className,
}: TagMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isSelected = (tag: Tag) => selected.some((t) => t.id === tag.id);
  const atCapacity = maxSelected !== undefined && selected.length >= maxSelected;

  const toggle = (tag: Tag) => {
    if (isSelected(tag)) {
      onChange(selected.filter((t) => t.id !== tag.id));
      return;
    }
    if (atCapacity) {
      onMaxSelected?.();
      return;
    }
    onChange([...selected, tag]);
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {name &&
        selected.map((tag) => (
          <input key={tag.id} type="hidden" name={name} value={tag.id} />
        ))}

      {label && <span className="text-sm font-medium">{label}</span>}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
            >
              {tag.tag_name}
              <button
                type="button"
                onClick={() => toggle(tag)}
                className="transition-colors hover:text-primary-foreground/70"
                aria-label={`Remove ${tag.tag_name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span>
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
            {availableTags.map((tag) => {
              const selectedNow = isSelected(tag);
              const disabled = atCapacity && !selectedNow;
              return (
                <div
                  key={tag.id}
                  onClick={() => toggle(tag)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between border-b px-4 py-2 text-sm last:border-0",
                    selectedNow ? "bg-muted font-medium" : "hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex flex-col">
                    <span>{tag.tag_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {tag.category}
                    </span>
                  </div>
                  {selectedNow && <Check className="size-4 text-primary" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
