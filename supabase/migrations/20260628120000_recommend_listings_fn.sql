-- Personalized listing recommendations.
--
-- Ranks every listing for the current tourist by IDF-weighted cosine similarity
-- between the tourist's quiz tags (tourist_tags) and each listing's tags (listing_tags).
--
--   IDF(tag) = ln(total_listings / listings_carrying_tag)   -- rarer tags weigh more
--   score(L) = (T . L) / (||T|| * ||L||)                    -- cosine of IDF-weighted vectors
--
-- A tourist who picked no tags (skipped the whole quiz) scores 0 against every
-- listing, so the feed gracefully degrades to newest-first instead of breaking.

-- The listing_tags PK is (listing_id, tag_id), so look-ups BY tag_id (used by every
-- scoring CTE below) have no usable index. Add one.
CREATE INDEX IF NOT EXISTS idx_listing_tags_tag_id ON public.listing_tags (tag_id);

CREATE OR REPLACE FUNCTION public.recommend_listings(
  p_limit  int DEFAULT 15,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  listing_name        text,
  listing_description  text,
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
  -- N = total number of listings (never 0, so we never divide by zero)
  params AS (
    SELECT GREATEST(COUNT(*), 1)::numeric AS n FROM listings
  ),
  -- IDF weight per tag, from how many listings carry it
  tag_idf AS (
    SELECT
      lt.tag_id,
      LN( (SELECT n FROM params) / COUNT(DISTINCT lt.listing_id) ) AS idf
    FROM listing_tags lt
    GROUP BY lt.tag_id
  ),
  -- The current tourist's chosen tags (RLS already scopes this to their own rows)
  me AS (
    SELECT tag_id FROM tourist_tags WHERE profile_id = auth.uid()
  ),
  -- ||T|| : magnitude of the tourist vector (one number, 0 if they picked nothing)
  tourist_norm AS (
    SELECT COALESCE(SQRT(SUM(ti.idf * ti.idf)), 0) AS norm
    FROM me JOIN tag_idf ti USING (tag_id)
  ),
  -- ||L|| : magnitude of each listing vector
  listing_norm AS (
    SELECT lt.listing_id, SQRT(SUM(ti.idf * ti.idf)) AS norm
    FROM listing_tags lt JOIN tag_idf ti USING (tag_id)
    GROUP BY lt.listing_id
  ),
  -- T . L : dot product over the SHARED tags only (the join to `me` enforces "shared")
  dot AS (
    SELECT lt.listing_id, SUM(ti.idf * ti.idf) AS dp
    FROM listing_tags lt
    JOIN me      USING (tag_id)
    JOIN tag_idf ti USING (tag_id)
    GROUP BY lt.listing_id
  )
  SELECT
    l.id,
    l.listing_name,
    l.listing_description,
    l.listing_address,
    l.open_time,
    l.close_time,
    -- Tag pills for the card, aggregated in the same round trip
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'tag_name', t.tag_name))
       FROM listing_tags lt
       JOIN tags t ON t.id = lt.tag_id
       WHERE lt.listing_id = l.id),
      '[]'::jsonb
    ) AS tags,
    -- cosine; 0 when there is no overlap or the tourist has no tags
    COALESCE(d.dp / NULLIF((SELECT norm FROM tourist_norm) * ln.norm, 0), 0) AS match_score,
    -- Full count (window runs before LIMIT), so the UI can do page math later
    COUNT(*) OVER() AS total_count
  FROM listings l
  LEFT JOIN dot d           ON d.listing_id = l.id   -- LEFT JOIN keeps zero-overlap listings
  LEFT JOIN listing_norm ln ON ln.listing_id = l.id
  ORDER BY match_score DESC, l.created_at DESC, l.id  -- id = deterministic tiebreak for paging
  LIMIT p_limit OFFSET p_offset;
$$;

-- Tourists are authenticated users; let them call it.
GRANT EXECUTE ON FUNCTION public.recommend_listings(int, int) TO authenticated;
