-- ============================================================
-- Role-hardened RLS
-- Adds role checks to all write policies so that even direct
-- Supabase API calls are blocked for the wrong user role.
-- ============================================================

-- Helper functions: cached per-statement, so multiple policies
-- in the same query only run the lookup once.
CREATE OR REPLACE FUNCTION public.is_business_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'business_owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tourist()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tourist'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_business_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tourist() TO authenticated;

-- ── listings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owners can insert listings" ON public.listings;
CREATE POLICY "Owners can insert listings"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid() AND is_business_owner());

DROP POLICY IF EXISTS "Owners can update own listings" ON public.listings;
CREATE POLICY "Owners can update own listings"
ON public.listings FOR UPDATE
TO authenticated
USING (profile_id = auth.uid() AND is_business_owner());

DROP POLICY IF EXISTS "Owners can delete own listings" ON public.listings;
CREATE POLICY "Owners can delete own listings"
ON public.listings FOR DELETE
TO authenticated
USING (profile_id = auth.uid() AND is_business_owner());

-- ── listing_tags ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Listing owners can insert listing tags" ON public.listing_tags;
CREATE POLICY "Listing owners can insert listing tags"
ON public.listing_tags FOR INSERT
TO authenticated
WITH CHECK (
  is_business_owner()
  AND listing_id IN (
    SELECT id FROM public.listings WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Listing owners can delete listing tags" ON public.listing_tags;
CREATE POLICY "Listing owners can delete listing tags"
ON public.listing_tags FOR DELETE
TO authenticated
USING (
  is_business_owner()
  AND listing_id IN (
    SELECT id FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- ── listing_images ────────────────────────────────────────────
DROP POLICY IF EXISTS "Listing owners can insert listing images" ON public.listing_images;
CREATE POLICY "Listing owners can insert listing images"
ON public.listing_images FOR INSERT
TO authenticated
WITH CHECK (
  is_business_owner()
  AND listing_id IN (SELECT id FROM public.listings WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "Listing owners can update listing images" ON public.listing_images;
CREATE POLICY "Listing owners can update listing images"
ON public.listing_images FOR UPDATE
TO authenticated
USING (
  is_business_owner()
  AND listing_id IN (SELECT id FROM public.listings WHERE profile_id = auth.uid())
);

DROP POLICY IF EXISTS "Listing owners can delete listing images" ON public.listing_images;
CREATE POLICY "Listing owners can delete listing images"
ON public.listing_images FOR DELETE
TO authenticated
USING (
  is_business_owner()
  AND listing_id IN (SELECT id FROM public.listings WHERE profile_id = auth.uid())
);

-- ── storage.objects (listing-images bucket) ───────────────────
DROP POLICY IF EXISTS "Listing owners can upload listing images" ON storage.objects;
CREATE POLICY "Listing owners can upload listing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images'
  AND is_business_owner()
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Listing owners can delete listing images" ON storage.objects;
CREATE POLICY "Listing owners can delete listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND is_business_owner()
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- ── itineraries ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can create itineraries" ON public.itineraries;
CREATE POLICY "Users can create itineraries"
ON public.itineraries FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid() AND is_tourist());

DROP POLICY IF EXISTS "Users can update own itineraries" ON public.itineraries;
CREATE POLICY "Users can update own itineraries"
ON public.itineraries FOR UPDATE
TO authenticated
USING (profile_id = auth.uid() AND is_tourist());

DROP POLICY IF EXISTS "Users can delete own itineraries" ON public.itineraries;
CREATE POLICY "Users can delete own itineraries"
ON public.itineraries FOR DELETE
TO authenticated
USING (profile_id = auth.uid() AND is_tourist());

-- ── itinerary_listings ────────────────────────────────────────
DROP POLICY IF EXISTS "Itinerary owners can add stops" ON public.itinerary_listings;
CREATE POLICY "Itinerary owners can add stops"
ON public.itinerary_listings FOR INSERT
TO authenticated
WITH CHECK (
  is_tourist()
  AND itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Itinerary owners can update stops" ON public.itinerary_listings;
CREATE POLICY "Itinerary owners can update stops"
ON public.itinerary_listings FOR UPDATE
TO authenticated
USING (
  is_tourist()
  AND itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Itinerary owners can delete stops" ON public.itinerary_listings;
CREATE POLICY "Itinerary owners can delete stops"
ON public.itinerary_listings FOR DELETE
TO authenticated
USING (
  is_tourist()
  AND itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

-- ── tourist_tags ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Tourists can add own tags" ON public.tourist_tags;
CREATE POLICY "Tourists can add own tags"
ON public.tourist_tags FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid() AND is_tourist());

DROP POLICY IF EXISTS "Tourists can remove own tags" ON public.tourist_tags;
CREATE POLICY "Tourists can remove own tags"
ON public.tourist_tags FOR DELETE
TO authenticated
USING (profile_id = auth.uid() AND is_tourist());
