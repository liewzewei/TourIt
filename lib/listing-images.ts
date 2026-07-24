// Shared constants and pure helpers for listing images, used by both the
// client-side upload form and the server action that records the uploads.
// Deliberately isomorphic (no "client-only"/"server-only" marker) so a single
// set of limits backs the client-side feedback and the server-side re-check.
//
// The limits below mirror the bucket created in
// 20260722041349_create_listing_images_bucket.sql. Storage enforces them
// server-side regardless, so these are for fast feedback, not the security
// boundary.

export const LISTING_IMAGES_BUCKET = "listing-images";

export const MAX_IMAGES_PER_LISTING = 5;

// Mirrors the bucket's file_size_limit (5 MB).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Mirrors the bucket's allowed_mime_types.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

// Validates a batch of files against the limits above, checking count, then
// type, then size. Returns a user-facing error message, or null when the batch
// is acceptable. An empty batch is valid -- images are optional on a listing.
export function validateImageFiles(files: File[]): string | null {
  if (files.length > MAX_IMAGES_PER_LISTING) {
    return `You can upload at most ${MAX_IMAGES_PER_LISTING} images per listing.`;
  }

  for (const file of files) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return `"${file.name}" isn't a supported format. Upload a JPG or PNG.`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `"${file.name}" is larger than ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`;
    }
  }

  return null;
}

// Public URL for a stored image path ("<listing_id>/<uuid>.<ext>"). The bucket
// is public, so this is a pure string build -- no auth and no client instance
// needed (unlike supabase.storage.getPublicUrl()).
export function getListingImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${path}`;
}
