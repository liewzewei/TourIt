-- 1. Add new columns to existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN display_name TEXT,
  ADD COLUMN avatar_url TEXT;

-- Update trigger to populate new columns from Google OAuth metadata
CREATE OR REPLACE FUNCTION public.create_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, avatar_url)
  VALUES (
    NEW.id,
    NULL,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Tags table (shared vocabulary for tourists and listings)
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT NOT NULL UNIQUE
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;


-- 3. Listings table (created by business owners)
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  listing_name TEXT NOT NULL,
  listing_description TEXT,
  listing_address TEXT,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;


-- 4. Itineraries table (created by tourists)
CREATE TABLE public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  itinerary_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;


-- 5. Junction: tourist_tags (tourist <-> tags, M:M)
CREATE TABLE public.tourist_tags (
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  tag_id UUID NOT NULL REFERENCES public.tags(id),
  PRIMARY KEY (profile_id, tag_id)
);

ALTER TABLE public.tourist_tags ENABLE ROW LEVEL SECURITY;


-- 6. Junction: listing_tags (listing <-> tags, M:M)
CREATE TABLE public.listing_tags (
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  tag_id UUID NOT NULL REFERENCES public.tags(id),
  PRIMARY KEY (listing_id, tag_id)
);

ALTER TABLE public.listing_tags ENABLE ROW LEVEL SECURITY;


-- 7. Junction: itinerary_listings (itinerary <-> listing, M:M)
CREATE TABLE public.itinerary_listings (
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id),
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  PRIMARY KEY (itinerary_id, listing_id)
);

ALTER TABLE public.itinerary_listings ENABLE ROW LEVEL SECURITY;