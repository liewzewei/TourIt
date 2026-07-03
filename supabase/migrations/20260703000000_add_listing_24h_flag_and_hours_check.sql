-- Phase 1: enforce valid business-listing operating hours.
--
-- Rule: a listing is either "open 24 hours", or it must have both an opening and
-- a closing time with the opening strictly before the closing.

-- 1. Add the 24-hour flag (defaults to false: owners must supply hours).
ALTER TABLE public.listings
  ADD COLUMN is_24_hours BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill legacy rows. Existing listings may have null or invalid hours,
--    which would violate the CHECK below. Treat any such row as "open 24 hours"
--    (and clear its times) so the constraint can be added without data loss.
--    Rows with already-valid hours are left untouched.
UPDATE public.listings
SET is_24_hours = true,
    open_time = NULL,
    close_time = NULL
WHERE open_time IS NULL
   OR close_time IS NULL
   OR open_time >= close_time;

-- 3. Enforce the rule at the database level (backstop for the app validation).
ALTER TABLE public.listings
  ADD CONSTRAINT valid_listing_hours CHECK (
    is_24_hours
    OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
  );
