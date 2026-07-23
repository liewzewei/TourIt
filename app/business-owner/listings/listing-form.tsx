"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createListing, saveListingImages, type ActionState } from "./action";
import { X, Check, ChevronDown } from "lucide-react";
import { useToast } from "@/context/toast-context";
import { isValidTimeRange } from "@/lib/time-constraints";
import createClient from "@/lib/supabase/client";
import {
  LISTING_IMAGES_BUCKET,
  MAX_IMAGES_PER_LISTING,
  MAX_IMAGE_BYTES,
  validateImageFiles,
} from "@/lib/listing-images";

export type Tag = {
  id: string;
  tag_name: string;
  category: string;
};

// A picked file paired with its preview URL. Kept together in one array so the
// two can never drift out of sync, and so revoking on removal is trivial.
type SelectedImage = { file: File; previewUrl: string };

export default function ListingForm({ availableTags }: { availableTags: Tag[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createListing, null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Object URLs must be released manually or they leak for the page's lifetime.
  // Removal revokes eagerly (see removeImage); this pair of effects tracks the
  // still-live URLs in a ref so unmount can release whatever is left. Revoking
  // in an [images] cleanup instead would kill URLs that are still on screen.
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    previewUrlsRef.current = images.map((image) => image.previewUrl);
  }, [images]);
  useEffect(() => {
    const urls = previewUrlsRef;
    return () => urls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Surface server action results as toasts.
  useEffect(() => {
    if (state?.error) {
      toast({ variant: "destructive", title: "Couldn't create listing", description: state.error });
    } else if (state?.success) {
      toast({ variant: "success", title: "Listing created", description: "Your listing was created successfully." });
    }
  }, [state, toast]);

  // Images go straight from the browser to Storage, and only AFTER the listing
  // exists: the storage policy authorises by the listing id in the object path,
  // so it can't pass until createListing has handed one back. Only the resulting
  // paths travel through a server action -- never the file bytes.
  const uploadedForListing = useRef<string | null>(null);
  useEffect(() => {
    const listingId = state?.listingId;
    if (!listingId || images.length === 0) return;
    // Re-renders must not re-upload a batch that is already in flight or done.
    if (uploadedForListing.current === listingId) return;
    uploadedForListing.current = listingId;

    const batch = images;

    (async () => {
      setIsUploading(true);
      const supabase = createClient();
      const uploaded: string[] = [];

      // Sequential rather than Promise.all: at most 5 small files, and it keeps
      // failure attribution simple.
      for (const { file } of batch) {
        const extension = file.type === "image/png" ? "png" : "jpg";
        const path = `${listingId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from(LISTING_IMAGES_BUCKET)
          .upload(path, file, {
            contentType: file.type,
            // Safe to cache for a year: every path carries a fresh UUID and is
            // never overwritten.
            cacheControl: "31536000",
          });
        if (error) {
          console.error("Image upload failed:", error);
        } else {
          uploaded.push(path);
        }
      }

      // Objects with no listing_images row are invisible to the app, so a failed
      // insert makes the whole batch a failure (the files are tolerated garbage).
      let savedCount = 0;
      if (uploaded.length > 0) {
        const result = await saveListingImages(listingId, uploaded);
        if (result?.error) {
          console.error("Saving image records failed:", result.error);
        } else {
          savedCount = uploaded.length;
        }
      }

      if (savedCount === batch.length) {
        toast({
          variant: "success",
          title: "Images uploaded",
          description: `${savedCount} image${savedCount === 1 ? "" : "s"} added to your listing.`,
        });
      } else if (savedCount > 0) {
        toast({
          variant: "destructive",
          title: "Some images didn't upload",
          description: `${savedCount} of ${batch.length} images were added; the rest failed.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Couldn't upload images",
          description: "Your listing was created, but its images failed to upload.",
        });
      }

      // Revoke explicitly: clearing the state below drops these URLs from
      // previewUrlsRef, so the unmount cleanup would never see them again.
      batch.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setImages([]);
      setIsUploading(false);
    })();
  }, [state, images, toast]);

  // Instant client-side feedback; the server action and DB constraint remain the
  // authoritative checks.
  const hoursRangeInvalid =
    !is24Hours && openTime !== "" && closeTime !== "" && !isValidTimeRange(openTime, closeTime);

  const handleImagesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    // Clear the input so removing a file and re-picking it still fires onChange.
    event.target.value = "";
    if (picked.length === 0) return;

    // Validate the resulting batch, not just the new files, so the count cap
    // accounts for what is already staged. Storage re-checks size/type anyway.
    const error = validateImageFiles([...images.map((image) => image.file), ...picked]);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't add images", description: error });
      return;
    }

    setImages([
      ...images,
      ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].previewUrl);
    setImages(images.filter((_, i) => i !== index));
  };

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

      {/* --- IMAGE PICKER --- */}
      <div className="w-full flex flex-col gap-2 pt-2">
        <label htmlFor="listing_images" className="block text-sm font-medium">
          Images (optional, up to {MAX_IMAGES_PER_LISTING})
        </label>
        <p className="text-xs text-gray-500">
          JPG or PNG, up to {MAX_IMAGE_BYTES / (1024 * 1024)} MB each. The first image is used as the cover.
        </p>

        {/*
          No `name` attribute, deliberately. A named file input is serialized
          into this form's action payload, pushing the image bytes through the
          server action (which has a 1 MB body limit by default). Unnamed inputs
          are left out, so the files stay client-side and are uploaded straight
          to Storage instead.
        */}
        <input
          id="listing_images"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={handleImagesSelected}
          disabled={isUploading || images.length >= MAX_IMAGES_PER_LISTING}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        />

        {images.length >= MAX_IMAGES_PER_LISTING && (
          <p className="text-xs text-gray-500">
            Maximum of {MAX_IMAGES_PER_LISTING} images reached. Remove one to add another.
          </p>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-1">
            {images.map((image, index) => (
              <div
                key={image.previewUrl}
                className="relative aspect-video overflow-hidden rounded-md border bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element --
                    these are local blob: previews; next/image can't optimize
                    them because the server cannot fetch a blob: URL. */}
                <img
                  src={image.previewUrl}
                  alt={image.file.name}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={isUploading}
                  aria-label={`Remove ${image.file.name}`}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" disabled={isPending || isUploading || hoursRangeInvalid} className="w-full bg-black text-white rounded-md py-2 px-4 hover:bg-neutral-800 disabled:opacity-50 mt-4">
        {isUploading ? "Uploading images..." : isPending ? "Creating..." : "Create Listing"}
      </button>
    </form>
  );
} 