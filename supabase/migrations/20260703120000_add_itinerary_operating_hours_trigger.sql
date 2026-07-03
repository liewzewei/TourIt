-- Phase 3: DB backstop for the operating-hours rule.
--
-- A scheduled visit must fall within its listing's opening hours. This is a
-- cross-table rule (itinerary_listings -> listings), so it can't be a CHECK
-- constraint and must be a trigger. It guarantees the rule even for writes that
-- bypass the app validation (the AI scheduler, direct API calls, etc.).
--
-- Mirrors lib/time-constraints.ts `isWithinOperatingHours`: inclusive boundary
-- (a visit may start exactly at opening and end exactly at closing); 24h venues
-- and venues with no recorded hours are not constrained. Pending stops (null
-- times) are skipped. The per-stop "end after start" rule stays with the
-- existing valid_itinerary_time CHECK.

CREATE OR REPLACE FUNCTION public.enforce_visit_within_operating_hours()
RETURNS TRIGGER AS $$
DECLARE
  listing RECORD;
BEGIN
  -- Pending stops have no times to validate.
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_24_hours, open_time, close_time
  INTO listing
  FROM public.listings
  WHERE id = NEW.listing_id;

  -- 24h venues, or venues with no recorded hours, can't constrain the visit.
  IF listing.is_24_hours OR listing.open_time IS NULL OR listing.close_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- Inclusive boundary check.
  IF NEW.start_time < listing.open_time OR NEW.end_time > listing.close_time THEN
    RAISE EXCEPTION
      'Visit % - % is outside the listing''s operating hours (% - %)',
      NEW.start_time, NEW.end_time, listing.open_time, listing.close_time
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visit_within_operating_hours ON public.itinerary_listings;

CREATE TRIGGER trg_visit_within_operating_hours
  BEFORE INSERT OR UPDATE ON public.itinerary_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_visit_within_operating_hours();
