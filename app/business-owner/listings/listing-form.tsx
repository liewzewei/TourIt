"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createListing, saveListingImages, type ActionState } from "./action";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TimeRangeField from "@/components/ui/time-range-field";
import TagMultiSelect, { type Tag } from "@/components/tag-multi-select";
import { useToast } from "@/context/toast-context";
import { isValidTimeRange } from "@/lib/time-constraints";
import createClient from "@/lib/supabase/client";
import {
  LISTING_IMAGES_BUCKET,
  MAX_IMAGES_PER_LISTING,
  MAX_IMAGE_BYTES,
  validateImageFiles,
} from "@/lib/listing-images";

const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
});

// A picked file paired with its preview URL. Kept together in one array so the
// two can never drift out of sync, and so revoking on removal is trivial.
type SelectedImage = { file: File; previewUrl: string };

export default function ListingForm({ availableTags }: { availableTags: Tag[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createListing, null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // --- Location & Address State ---
  const [postalCode, setPostalCode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [unitNum, setUnitNum] = useState("");
  const [directionsTip, setDirectionsTip] = useState("");
  const [showExtraLocation, setShowExtraLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationPicked = (result: {
    lat: number;
    lng: number;
    address?: string;
    postalCode?: string;
  }) => {
    setCoords({ lat: result.lat, lng: result.lng });
    if (result.address) setAddressLine(result.address);
    if (result.postalCode) setPostalCode(result.postalCode);
  };

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

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Listing Name" required>
        {(f) => <Input {...f} type="text" name="listing_name" required />}
      </Field>

      <Field label="Description" description="Aim for 100–200 words.">
        {/* rows sizes the box to fit the placeholder prompt; field-sizing-fixed
            overrides the primitive's content-sizing so the box stays put and
            scrolls once a description outgrows it, rather than growing without
            bound. The word-count guidance lives in the field's help slot. */}
        {(f) => (
          <Textarea
            {...f}
            name="listing_description"
            rows={4}
            placeholder="Describe your business — what makes it special, what do you offer, and who is it for?"
            className="field-sizing-fixed"
          />
        )}
      </Field>

      {/* --- LOCATION & MAP --- */}
      <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
        <h3 className="text-sm font-semibold">Location</h3>

        {/* Hidden inputs for lat/lng */}
        <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
        <input type="hidden" name="longitude" value={coords?.lng ?? ""} />

        {/* Interactive Map with search */}
        <LocationPicker coords={coords} onLocationSelect={handleLocationPicked} />

        {/* Address fields — auto-filled by map, but editable */}
        <Field label="Street Address, City & Country" required>
          {(f) => (
            <Input
              {...f}
              type="text"
              name="listing_address"
              required
              placeholder="Auto-filled when you drop a pin, or type manually"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
          )}
        </Field>

        {/* Toggle for extra location details */}
        <label className="flex items-center gap-2 text-sm font-medium pt-1">
          <input
            type="checkbox"
            checked={showExtraLocation}
            onChange={(e) => setShowExtraLocation(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Add extra location details
        </label>

        {showExtraLocation ? (
          <div className="flex flex-col gap-4 pl-6 border-l-2 border-muted">
            <Field label="Postal / Zip Code">
              {(f) => (
                <Input
                  {...f}
                  type="text"
                  name="postal_code"
                  placeholder="e.g. 75007"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              )}
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Unit / Floor">
                {(f) => (
                  <Input
                    {...f}
                    type="text"
                    name="unit_number"
                    placeholder="e.g. #01-15 or Suite 402"
                    value={unitNum}
                    onChange={(e) => setUnitNum(e.target.value)}
                  />
                )}
              </Field>
              <Field label="How to Get There">
                {(f) => (
                  <Input
                    {...f}
                    type="text"
                    name="directions_tip"
                    placeholder="e.g. Enter via the North Gate"
                    value={directionsTip}
                    onChange={(e) => setDirectionsTip(e.target.value)}
                  />
                )}
              </Field>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Postal code, unit/floor, and directions can be added here.
          </p>
        )}

        {/* Coordinates confirmation */}
        {coords && (
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            <span>Coordinates locked:</span>
            <span className="font-mono">({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})</span>
          </p>
        )}
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
            className="h-4 w-4 rounded border-input"
          />
          Open 24 hours
        </label>

        {/* The hours pair shares one range error. Names carry the values into
            the server action; the DB CHECK stays the authoritative guard. */}
        <TimeRangeField
          startValue={openTime}
          endValue={closeTime}
          onStartChange={setOpenTime}
          onEndChange={setCloseTime}
          startLabel={is24Hours ? "Opening Time" : "Opening Time *"}
          endLabel={is24Hours ? "Closing Time" : "Closing Time *"}
          startName="open_time"
          endName="close_time"
          startId="open_time"
          endId="close_time"
          disabled={is24Hours}
          error="Closing time must be after opening time."
        />
      </div>

      <TagMultiSelect
        availableTags={availableTags}
        selected={selectedTags}
        onChange={setSelectedTags}
        maxSelected={5}
        onMaxSelected={() =>
          toast({ description: "You can only select up to 5 tags." })
        }
        name="selected_tags"
        label="Listing Tags (Choose up to 5)"
        className="pt-2"
      />

      {/* --- IMAGE PICKER --- */}
      <div className="w-full flex flex-col gap-2 pt-2">
        <label htmlFor="listing_images" className="block text-sm font-medium">
          Images (optional, up to {MAX_IMAGES_PER_LISTING})
        </label>
        <p className="text-xs text-muted-foreground">
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
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground hover:file:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        />

        {images.length >= MAX_IMAGES_PER_LISTING && (
          <p className="text-xs text-muted-foreground">
            Maximum of {MAX_IMAGES_PER_LISTING} images reached. Remove one to add another.
          </p>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-1">
            {images.map((image, index) => (
              <div
                key={image.previewUrl}
                className="relative aspect-video overflow-hidden rounded-md border bg-muted"
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
                  <span className="absolute left-1 top-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-medium text-background">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={isUploading}
                  aria-label={`Remove ${image.file.name}`}
                  className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background hover:bg-foreground disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending || isUploading || hoursRangeInvalid} className="w-full mt-4">
        {isUploading ? "Uploading images..." : isPending ? "Creating..." : "Create Listing"}
      </Button>
    </form>
  );
} 