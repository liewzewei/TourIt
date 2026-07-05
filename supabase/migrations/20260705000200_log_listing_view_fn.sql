-- Record that the current tourist opened a listing's detail page today.
--
-- Called from the detail Server Component via Next's after(), so it runs after
-- the response is sent and never blocks the page.
--
-- SECURITY DEFINER: listing_views is locked down (RLS default-deny + no grant to
-- `authenticated`), so only this function — executing as the table owner — may
-- write it. Crucially, auth.uid() is STILL the caller's id inside a DEFINER
-- function, so we record the correct viewer and can exclude the listing's owner.
CREATE OR REPLACE FUNCTION public.log_listing_view(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer uuid := auth.uid();
BEGIN
  -- Not signed in: nothing to attribute. The app is auth-gated, so this is a
  -- defensive guard rather than an expected path.
  IF v_viewer IS NULL THEN
    RETURN;
  END IF;

  -- Log only if the listing exists AND the viewer is not its owner. This single
  -- check does double duty: it skips owner self-views (no inflating your own
  -- numbers) and no-ops on unknown listing ids (avoids an FK violation on the
  -- insert below).
  IF NOT EXISTS (
    SELECT 1 FROM listings
    WHERE id = p_listing_id AND profile_id <> v_viewer
  ) THEN
    RETURN;
  END IF;

  -- One row per (listing, viewer, SGT day); the PK makes repeat views today a
  -- no-op, so refreshes and re-opens never inflate the count.
  INSERT INTO listing_views (listing_id, viewer_id)
  VALUES (p_listing_id, v_viewer)
  ON CONFLICT (listing_id, viewer_id, viewed_on) DO NOTHING;
END;
$$;

-- Tourists are authenticated users; let them call it. (The function body still
-- runs as the owner, so the caller gains no direct access to listing_views.)
GRANT EXECUTE ON FUNCTION public.log_listing_view(uuid) TO authenticated;
