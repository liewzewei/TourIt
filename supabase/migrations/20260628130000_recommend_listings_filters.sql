-- Add optional manual filters to the recommendation feed: tags (match ANY) and
-- an "open during this window" time filter. Ranking is unchanged — filters only
-- narrow the candidate set (a WHERE), the IDF/cosine score still orders it.
--
-- Adding parameters changes the function signature, so CREATE OR REPLACE would
-- leave a second 2-arg overload behind and make PostgREST's RPC call ambiguous.
-- Drop the old signature first, then recreate. Return columns are unchanged.

DROP FUNCTION IF EXISTS public.recommend_listings(int, int);

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
