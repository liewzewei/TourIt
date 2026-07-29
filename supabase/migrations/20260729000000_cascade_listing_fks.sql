-- Add ON DELETE CASCADE to foreign keys referencing listings(id)
-- so that deleting a listing automatically cleans up related rows,
-- regardless of which user (role) performs the delete.

-- 1. itinerary_listings.listing_id (currently no cascade — blocks listing deletion)
ALTER TABLE public.itinerary_listings
  DROP CONSTRAINT itinerary_listings_listing_id_fkey,
  ADD CONSTRAINT itinerary_listings_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- 2. listing_tags.listing_id (currently no cascade — also needs cleanup)
ALTER TABLE public.listing_tags
  DROP CONSTRAINT listing_tags_listing_id_fkey,
  ADD CONSTRAINT listing_tags_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
