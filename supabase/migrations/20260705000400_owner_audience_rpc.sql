-- Anonymized audience profile for the analytics dashboard: the quiz-tag makeup of
-- the travellers who SAVED an owner's listing(s). SECURITY DEFINER + self-scoped
-- like the other analytics RPCs, and aggregate-only — profile_ids are used only
-- inside CTEs for counting and are NEVER returned.
--
-- k-anonymity: the tag distribution (`tags`) is withheld (null) until at least
-- `threshold` DISTINCT savers are in the sample, so a small group can't be
-- de-anonymized. `saver_count` is always returned so the UI can show progress
-- ("N of 10 so far"). p_listing_id NULL = portfolio (all owned listings); a
-- non-null id = that listing if the caller owns it. Not period-scoped: the
-- audience is cumulative ("who is interested in me"), which also keeps the sample
-- larger and the k-gate safer.
CREATE OR REPLACE FUNCTION public.get_owner_audience_tags(p_listing_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scope AS (
    SELECT l.id
    FROM listings l
    WHERE l.profile_id = auth.uid()
      AND (p_listing_id IS NULL OR l.id = p_listing_id)
  ),
  -- Distinct savers (people) of the in-scope listings. DISTINCT dedupes a saver
  -- who added the listing to several itineraries, or saved several of the owner's
  -- listings (at portfolio scope).
  savers AS (
    SELECT DISTINCT it.profile_id
    FROM itinerary_listings il
    JOIN scope s        ON s.id = il.listing_id
    JOIN itineraries it ON it.id = il.itinerary_id
  ),
  -- Distinct savers who picked each tag. (savers is already unique, and
  -- tourist_tags is unique per (profile, tag), so count(*) == distinct savers.)
  tag_counts AS (
    SELECT t.tag_name, t.category, count(*)::int AS savers
    FROM savers sv
    JOIN tourist_tags tt ON tt.profile_id = sv.profile_id
    JOIN tags t          ON t.id = tt.tag_id
    GROUP BY t.tag_name, t.category
    ORDER BY savers DESC, t.tag_name
  ),
  meta AS (
    SELECT (SELECT count(*)::int FROM savers) AS saver_count, 10 AS threshold
  )
  SELECT jsonb_build_object(
    'saver_count', m.saver_count,
    'threshold',   m.threshold,
    -- Below the threshold: withhold the distribution entirely (null).
    'tags',
    CASE WHEN m.saver_count >= m.threshold
      THEN COALESCE(
             (SELECT jsonb_agg(jsonb_build_object(
                 'tag_name', tag_name, 'category', category, 'savers', savers))
              FROM tag_counts),
             '[]'::jsonb)
      ELSE NULL
    END
  )
  FROM meta m;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_audience_tags(uuid) TO authenticated;
