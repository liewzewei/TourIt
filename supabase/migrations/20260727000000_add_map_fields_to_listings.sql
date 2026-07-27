-- Add postal code, unit number, navigation tips, and GPS coordinates to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS unit_number TEXT,
  ADD COLUMN IF NOT EXISTS directions_tip TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add an index on coordinates for future location-based/radius queries
CREATE INDEX IF NOT EXISTS idx_listings_coordinates ON public.listings (latitude, longitude);