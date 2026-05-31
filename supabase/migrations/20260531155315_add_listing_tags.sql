-- 1. Add the category column to your existing tags table
ALTER TABLE public.tags ADD COLUMN category TEXT;

-- 2. Insert the 15 tags into the existing tags table
INSERT INTO public.tags (tag_name, category) VALUES 
  -- Nature & Outdoors
  ('Scenic Views', 'Nature & Outdoors'),
  ('Wildlife & Nature', 'Nature & Outdoors'),
  ('Waterfront', 'Nature & Outdoors'),
  
  -- Food & Drink
  ('Local Cuisine', 'Food & Drink'),
  ('Café & Coffee', 'Food & Drink'),
  ('Street Food', 'Food & Drink'),

  -- Culture & Heritage
  ('Historical Site', 'Culture & Heritage'),
  ('Arts & Culture', 'Culture & Heritage'),
  ('Local Craft', 'Culture & Heritage'),

  -- Experience & Activity
  ('Family Friendly', 'Experience & Activity'),
  ('Adventure & Sports', 'Experience & Activity'),
  ('Wellness & Relaxation', 'Experience & Activity'),

  -- Business Vibe
  ('Hidden Gem', 'Business Vibe'),
  ('Budget Friendly', 'Business Vibe'),
  ('Unique Experience', 'Business Vibe');