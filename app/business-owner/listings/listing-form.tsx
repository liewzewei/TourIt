"use client";

import { useActionState, useEffect, useState } from "react";
import { createListing, type ActionState } from "./action";
import { X, Check, ChevronDown } from "lucide-react";
import { useToast } from "@/context/toast-context";
import { isValidTimeRange } from "@/lib/time-constraints";

export type Tag = {
  id: string;
  tag_name: string;
  category: string;
};

export default function ListingForm({ availableTags }: { availableTags: Tag[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createListing, null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const { toast } = useToast();

  // Surface server action results as toasts.
  useEffect(() => {
    if (state?.error) {
      toast({ variant: "destructive", title: "Couldn't create listing", description: state.error });
    } else if (state?.success) {
      toast({ variant: "success", title: "Listing created", description: "Your listing was created successfully." });
    }
  }, [state, toast]);

  // Instant client-side feedback; the server action and DB constraint remain the
  // authoritative checks.
  const hoursRangeInvalid =
    !is24Hours && openTime !== "" && closeTime !== "" && !isValidTimeRange(openTime, closeTime);

  const toggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      if (selectedTags.length >= 5) {
        toast({ description: "You can only select up to 5 tags." });
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <form action={formAction} className="space-y-4">
      {selectedTags.map((tag) => (
        <input key={tag.id} type="hidden" name="selected_tags" value={tag.id} />
      ))}

      <div>
        <label htmlFor="listing_name" className="block text-sm font-medium">Listing Name *</label>
        <input type="text" id="listing_name" name="listing_name" required className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
      </div>

      <div>
        <label htmlFor="listing_description" className="block text-sm font-medium">Description</label>
        <textarea id="listing_description" name="listing_description" 
        placeholder="Describe your business -- what makes it special, what do you offer, who is it for? (100-200 words)" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
      </div>

      <div>
        <label htmlFor="listing_address" className="block text-sm font-medium">Address</label>
        <input type="text" id="listing_address" name="listing_address" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="is_24_hours"
            value="true"
            checked={is24Hours}
            onChange={(e) => {
              setIs24Hours(e.target.checked);
              if (e.target.checked) {
                setOpenTime("");
                setCloseTime("");
              }
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          Open 24 hours
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="open_time" className="block text-sm font-medium">Opening Time {!is24Hours && "*"}</label>
            <input
              type="time"
              id="open_time"
              name="open_time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              disabled={is24Hours}
              required={!is24Hours}
              aria-invalid={hoursRangeInvalid}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
          <div>
            <label htmlFor="close_time" className="block text-sm font-medium">Closing Time {!is24Hours && "*"}</label>
            <input
              type="time"
              id="close_time"
              name="close_time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              disabled={is24Hours}
              required={!is24Hours}
              aria-invalid={hoursRangeInvalid}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        {hoursRangeInvalid && (
          <p className="text-sm text-destructive">Closing time must be after opening time.</p>
        )}
      </div>

      {/* --- NEW TAG SELECTOR UI --- */}
      <div className="w-full flex flex-col gap-2 pt-2">
        <label className="block text-sm font-medium">Listing Tags (Choose up to 5)</label>
        
        {/* Selected Badges */}
        <div className="flex flex-wrap gap-2 mb-1">
          {selectedTags.map((tag) => (
            <span key={tag.id} className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded-full text-xs font-medium">
              {tag.tag_name}
              <button type="button" onClick={() => toggleTag(tag)} className="hover:text-gray-300"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>

        {/* Dropdown Button */}
        <div className="relative">
          <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex justify-between items-center text-left px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
            <span>{selectedTags.length === 0 ? "Select tags..." : `${selectedTags.length} tags selected`}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.some((t) => t.id === tag.id);
                const isMaxedOut = selectedTags.length >= 5 && !isSelected;
                return (
                  <div key={tag.id} onClick={() => !isMaxedOut && toggleTag(tag)} className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm border-b last:border-0 ${isSelected ? "bg-gray-50 font-medium" : "hover:bg-gray-50"} ${isMaxedOut ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <div className="flex flex-col">
                      <span>{tag.tag_name}</span>
                      <span className="text-xs text-gray-500">{tag.category}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-black" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button type="submit" disabled={isPending || hoursRangeInvalid} className="w-full bg-black text-white rounded-md py-2 px-4 hover:bg-neutral-800 disabled:opacity-50 mt-4">
        {isPending ? "Creating..." : "Create Listing"}
      </button>
    </form>
  );
} 