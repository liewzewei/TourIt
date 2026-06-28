"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, ChevronDown } from "lucide-react";

export type Tag = {
  id: string;
  tag_name: string;
  category: string;
};

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.some((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  };

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

  const hasActiveFilters =
    selectedTags.length > 0 || openFrom !== "" || openUntil !== "";

  return (
    <div className="mb-8 p-4 border rounded-lg bg-gray-50/50">
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
        {/* Tag multi-select (match ANY) */}
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-sm font-medium">Tags</span>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded-full text-xs font-medium"
                >
                  {tag.tag_name}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="hover:text-gray-300"
                    aria-label={`Remove ${tag.tag_name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((o) => !o)}
              className="w-full flex justify-between items-center text-left px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <span>
                {selectedTags.length === 0
                  ? "Select tags..."
                  : `${selectedTags.length} selected`}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.some((t) => t.id === tag.id);
                  return (
                    <div
                      key={tag.id}
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm border-b last:border-0 ${
                        isSelected ? "bg-gray-50 font-medium" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{tag.tag_name}</span>
                        <span className="text-xs text-gray-500">
                          {tag.category}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-black" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Open during this window */}
        <div className="flex flex-col gap-2">
          <label htmlFor="open_from" className="text-sm font-medium">
            Open from
          </label>
          <input
            type="time"
            id="open_from"
            value={openFrom}
            onChange={(e) => setOpenFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="open_until" className="text-sm font-medium">
            Open until
          </label>
          <input
            type="time"
            id="open_until"
            value={openUntil}
            onChange={(e) => setOpenUntil(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="px-5 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition"
          >
            Apply
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-5 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
