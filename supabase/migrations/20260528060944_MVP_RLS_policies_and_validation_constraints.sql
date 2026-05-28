-- Tags: everyone can read, nobody writes through the app
CREATE POLICY "Anyone can view tags"
ON public.tags FOR SELECT
TO authenticated
USING (true);

-- Listings: everyone can read, owners can manage their own
CREATE POLICY "Anyone can view listings"
ON public.listings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can insert listings"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Owners can update own listings"
ON public.listings FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Owners can delete own listings"
ON public.listings FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Listing_tags: everyone can read, listing owner can manage
CREATE POLICY "Anyone can view listing tags"
ON public.listing_tags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Listing owners can insert listing tags"
ON public.listing_tags FOR INSERT
TO authenticated
WITH CHECK (
  listing_id IN (
    SELECT id FROM public.listings WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Listing owners can delete listing tags"
ON public.listing_tags FOR DELETE
TO authenticated
USING (
  listing_id IN (
    SELECT id FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Tourist_tags: tourists manage their own tag associations
CREATE POLICY "Tourists can view own tags"
ON public.tourist_tags FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Tourists can add own tags"
ON public.tourist_tags FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Tourists can remove own tags"
ON public.tourist_tags FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Itineraries: users manage their own
CREATE POLICY "Users can view own itineraries"
ON public.itineraries FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Users can create itineraries"
ON public.itineraries FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own itineraries"
ON public.itineraries FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own itineraries"
ON public.itineraries FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Itinerary_listings: owner of the parent itinerary can manage
CREATE POLICY "Itinerary owners can view own stops"
ON public.itinerary_listings FOR SELECT
TO authenticated
USING (
  itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Itinerary owners can add stops"
ON public.itinerary_listings FOR INSERT
TO authenticated
WITH CHECK (
  itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Itinerary owners can update stops"
ON public.itinerary_listings FOR UPDATE
TO authenticated
USING (
  itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Itinerary owners can delete stops"
ON public.itinerary_listings FOR DELETE
TO authenticated
USING (
  itinerary_id IN (
    SELECT id FROM public.itineraries WHERE profile_id = auth.uid()
  )
);

-- Check constraint: itinerary stop end must be after start
ALTER TABLE public.itinerary_listings
ADD CONSTRAINT valid_itinerary_time CHECK (
  start_date < end_date
  OR (start_date = end_date AND start_time < end_time)
);