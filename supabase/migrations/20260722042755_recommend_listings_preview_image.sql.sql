-- Add a preview image to the recommendation feed: each row now carries the
-- path of the listing's first image (lowest display_order), or NULL when the
-- listing has none. Ranking and filtering are unchanged — this is a display-only
-- column, embedded per row the same way `tags` already is.
--
-- Changing the RETURNS TABLE shape can't be done with CREATE OR REPLACE (it
-- cannot alter a function's OUT columns), so DROP the existing definition first,
-- then recreate. The signature is unchanged (same 5 params), so there is no
-- lingering overload for PostgREST to call ambiguously — but we still drop by the
-- full current signature to be explicit.

DROP FUNCTION IF EXISTS public.recommend_listings(int, int, uuid[], time, time);

CREATE FUNCTION public.recommend_listings(
  p_limit      int    DEFAULT 15,
  p_offset     int    DEFAULT 0,
  p_tag_ids    uuid[] DEFAULT NULL,   -- keep listings carrying ANY of these tags
  p_open_from  time   DEFAULT NULL,   -- keep listings open at/before this time ...
  p_open_until time   DEFAULT NULL    -- ... and still open at/after this time
)
RETURNS TABLE (
  id                  uuid,
  listing_name        text,
  listing_description text,
  listing_address     text,
  open_time           time,
  close_time          time,
  tags                jsonb,
  preview_image_path  text,           -- NEW: first image by display_order, or NULL
  match_score         numeric,
  total_count         bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER          -- run as the caller so RLS + auth.uid() apply
SET search_path = public
AS $$
  WITH
  -- IDF is a global property of the corpus, so it is always computed over ALL
  -- listings, independent of the filters applied below.
  params AS (
    SELECT GREATEST(COUNT(*), 1)::numeric AS n FROM listings
  ),
  tag_idf AS (
    SELECT
      lt.tag_id,
      LN( (SELECT n FROM params) / COUNT(DISTINCT lt.listing_id) ) AS idf
    FROM listing_tags lt
    GROUP BY lt.tag_id
  ),
  me AS (
    SELECT tag_id FROM tourist_tags WHERE profile_id = auth.uid()
  ),
  tourist_norm AS (
    SELECT COALESCE(SQRT(SUM(ti.idf * ti.idf)), 0) AS norm
    FROM me JOIN tag_idf ti USING (tag_id)
  ),
  listing_norm AS (
    SELECT lt.listing_id, SQRT(SUM(ti.idf * ti.idf)) AS norm
    FROM listing_tags lt JOIN tag_idf ti USING (tag_id)
    GROUP BY lt.listing_id
  ),
  dot AS (
    SELECT lt.listing_id, SUM(ti.idf * ti.idf) AS dp
    FROM listing_tags lt
    JOIN me      USING (tag_id)
    JOIN tag_idf ti USING (tag_id)
    GROUP BY lt.listing_id
  ),
  -- Manual filters. A NULL parameter means "filter disabled". Listings with
  -- unknown (NULL) hours are excluded when a time filter is active, since we
  -- cannot confirm they are open.
  filtered AS (
    SELECT l.*
    FROM listings l
    WHERE (p_tag_ids IS NULL OR EXISTS (
             SELECT 1 FROM listing_tags lt
             WHERE lt.listing_id = l.id AND lt.tag_id = ANY(p_tag_ids)))
      AND (p_open_from  IS NULL OR l.open_time  <= p_open_from)
      AND (p_open_until IS NULL OR l.close_time >= p_open_until)
  )
  SELECT
    f.id,
    f.listing_name,
    f.listing_description,
    f.listing_address,
    f.open_time,
    f.close_time,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'tag_name', t.tag_name))
       FROM listing_tags lt
       JOIN tags t ON t.id = lt.tag_id
       WHERE lt.listing_id = f.id),
      '[]'::jsonb
    ) AS tags,
    (SELECT li.image_path
     FROM listing_images li
     WHERE li.listing_id = f.id
     ORDER BY li.display_order, li.created_at
     LIMIT 1) AS preview_image_path,
    COALESCE(d.dp / NULLIF((SELECT norm FROM tourist_norm) * ln.norm, 0), 0) AS match_score,
    -- Window runs after the filter but before LIMIT → total of the FILTERED set
    COUNT(*) OVER() AS total_count
  FROM filtered f
  LEFT JOIN dot d           ON d.listing_id = f.id
  LEFT JOIN listing_norm ln ON ln.listing_id = f.id
  ORDER BY match_score DESC, f.created_at DESC, f.id
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.recommend_listings(int, int, uuid[], time, time) TO authenticated;
