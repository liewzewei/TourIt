-- Analytics needs a "saved at" timestamp to chart saves-over-time.
--
-- itinerary_listings is the "save" junction (a tourist adding a listing to an
-- itinerary), but it has no timestamp, so saves-over-time is impossible today.
-- Add one.
--
-- Backfill caveat: DEFAULT now() stamps every EXISTING save with this migration's
-- run time, clustering all pre-launch history on a single date. That is fine for
-- a new feature — the saves chart is honestly labelled "since <launch>", and every
-- NEW save records its real insertion time. NOT NULL is safe because no insert
-- path sets this column, so the default always applies.
ALTER TABLE public.itinerary_listings
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- The primary key is (itinerary_id, listing_id), so every per-listing save
-- aggregation in the analytics RPCs — which look up BY listing_id — has no usable
-- index. Add one (mirrors idx_listing_tags_tag_id, added for the same reason when
-- recommend_listings started scanning listing_tags by tag_id).
CREATE INDEX IF NOT EXISTS idx_itinerary_listings_listing_id
  ON public.itinerary_listings (listing_id);
