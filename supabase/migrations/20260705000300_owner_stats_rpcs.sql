-- Owner-facing aggregation for the analytics dashboard.
--
-- These are the deliberate INVERSE of recommend_listings: SECURITY DEFINER (so
-- they can read across the RLS boundary into other users' saves), but locked
-- down by three rules — every query is self-scoped to listings.profile_id =
-- auth.uid() (still the CALLER inside a DEFINER function), only aggregate counts
-- leave the function (never a viewer_id/profile_id), and search_path is pinned.
--
-- Counts are cast to ::int so PostgREST serializes them as JSON numbers (bigint
-- can come back as a string); per-listing view/save counts are far below int
-- range. "A day" is Asia/Singapore everywhere, matching listing_views.viewed_on.

-- 1. Per-listing totals for the selected period, plus the equal-length window
--    immediately before it (so the UI can show a period-over-period delta). One
--    row per listing the caller owns; save-rate and delta are derived in
--    lib/analytics.ts from these raw counts.
CREATE OR REPLACE FUNCTION public.get_owner_listing_stats(
  p_from date,
  p_to   date
)
RETURNS TABLE (
  listing_id   uuid,
  listing_name text,
  views        int,
  saves        int,
  prev_views   int,
  prev_saves   int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Previous window = the p_to..p_from span, shifted back to end the day before
  -- p_from. len = inclusive day count.
  SELECT
    l.id,
    l.listing_name,
    (SELECT count(*)::int FROM listing_views v
       WHERE v.listing_id = l.id
         AND v.viewed_on BETWEEN p_from AND p_to),
    (SELECT count(*)::int FROM itinerary_listings il
       WHERE il.listing_id = l.id
         AND (il.created_at AT TIME ZONE 'Asia/Singapore')::date BETWEEN p_from AND p_to),
    (SELECT count(*)::int FROM listing_views v
       WHERE v.listing_id = l.id
         AND v.viewed_on BETWEEN (p_from - (p_to - p_from + 1)) AND (p_from - 1)),
    (SELECT count(*)::int FROM itinerary_listings il
       WHERE il.listing_id = l.id
         AND (il.created_at AT TIME ZONE 'Asia/Singapore')::date
             BETWEEN (p_from - (p_to - p_from + 1)) AND (p_from - 1))
  FROM listings l
  WHERE l.profile_id = auth.uid()
  ORDER BY l.created_at DESC, l.id;
$$;

-- 2. Daily views + saves for the charted period, zero-filled so the series has
--    no gaps (generate_series calendar LEFT JOINed to the aggregates). A NULL
--    p_listing_id means the whole portfolio (all listings the caller owns); a
--    non-null one is scoped to that single listing IF the caller owns it — an
--    unowned id simply matches nothing and yields an all-zero series (no leak).
CREATE OR REPLACE FUNCTION public.get_owner_views_timeseries(
  p_listing_id uuid,
  p_from       date,
  p_to         date
)
RETURNS TABLE (
  day   date,
  views int,
  saves int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT gs::date AS day
    FROM generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') AS gs
  ),
  scope AS (
    SELECT l.id
    FROM listings l
    WHERE l.profile_id = auth.uid()
      AND (p_listing_id IS NULL OR l.id = p_listing_id)
  ),
  daily_views AS (
    SELECT v.viewed_on AS day, count(*)::int AS views
    FROM listing_views v
    JOIN scope s ON s.id = v.listing_id
    WHERE v.viewed_on BETWEEN p_from AND p_to
    GROUP BY v.viewed_on
  ),
  daily_saves AS (
    SELECT (il.created_at AT TIME ZONE 'Asia/Singapore')::date AS day, count(*)::int AS saves
    FROM itinerary_listings il
    JOIN scope s ON s.id = il.listing_id
    WHERE (il.created_at AT TIME ZONE 'Asia/Singapore')::date BETWEEN p_from AND p_to
    GROUP BY (il.created_at AT TIME ZONE 'Asia/Singapore')::date
  )
  SELECT
    d.day,
    COALESCE(dv.views, 0) AS views,
    COALESCE(ds.saves, 0) AS saves
  FROM days d
  LEFT JOIN daily_views dv ON dv.day = d.day
  LEFT JOIN daily_saves ds ON ds.day = d.day
  ORDER BY d.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_listing_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_views_timeseries(uuid, date, date) TO authenticated;
