-- ============================================================================
-- TourIt local seed data  (supabase/seed.sql)
--
-- Runs automatically AFTER all migrations on `supabase db reset` and on the
-- first `supabase start`. LOCAL ONLY: `supabase db push` (the production deploy)
-- applies migrations but never runs the seed, so none of this reaches prod.
--
-- Data only, no schema changes. Provides two demo accounts (email + password),
-- a handful of Singapore listings with tags, and a starter itinerary.
--
-- Demo logins (local only):
--   owner@tourit.local    / password123   (business_owner)
--   tourist@tourit.local  / password123   (tourist)
-- ============================================================================

-- pgcrypto (crypt/gen_salt) lives in the `extensions` schema on Supabase; put
-- both schemas on the search_path so password hashing resolves either way.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Auth users
--
-- Inserting into auth.users fires two triggers -- on_auth_user_created and
-- on_auth_user_created_profile -- which populate public.users and
-- public.profiles automatically. `full_name` in raw_user_meta_data is REQUIRED:
-- public.users.name is NOT NULL and the trigger reads it from there.
--
-- A matching auth.identities row is required for email/password sign-in in
-- recent GoTrue versions -- without it, login fails even though the user exists.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'owner@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Olivia Owner"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'tourist@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Tammy Tourist"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"owner@tourit.local","email_verified":true}',
   'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"tourist@tourit.local","email_verified":true}',
   'email', now(), now(), now())
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Roles. The trigger created both profiles with role = NULL; set them here.
--    (business_owner is onboarded immediately; the tourist is marked onboarded
--    too so the demo account skips the quiz and can browse right away.)
-- ---------------------------------------------------------------------------
update public.profiles
set role = 'business_owner', onboarding_completed = true
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set role = 'tourist', onboarding_completed = true
where id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- 3. Listings (owned by the business owner). The 15 tags already exist from the
--    add_listing_tags migration. Hours must satisfy valid_listing_hours:
--    either is_24_hours = true, or open_time < close_time.
-- ---------------------------------------------------------------------------
insert into public.listings (
  id, profile_id, listing_name, listing_description, listing_address,
  open_time, close_time, is_24_hours,
  latitude, longitude, directions_tip, unit_number
)
values
  ('10000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Marina Bay Sands SkyPark',
   'Observation deck with panoramic views over Marina Bay and the city skyline.',
   '10 Bayfront Ave, Singapore 018956',
   '09:30', '22:00', false,
   1.2834, 103.8607, 'Take the Tower 3 elevator to Level 57', '#57-01'),
  ('10000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Newton Food Centre',
   'Bustling hawker centre famous for chilli crab, satay and local favourites.',
   '500 Clemenceau Ave North, Singapore 229495',
   '16:00', '23:59', false,
   1.3120, 103.8389, 'Right next to Newton MRT Station Exit B', '#01-01'),
  ('10000000-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Gardens by the Bay',
   'Futuristic nature park with the Supertree Grove and climate-controlled domes.',
   '18 Marina Gardens Dr, Singapore 018953',
   '09:00', '21:00', false,
   1.2816, 103.8636, 'Enter via the underground linkway from Bayfront MRT', null),
  ('10000000-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111',
   'Mustafa Centre',
   'Sprawling 24-hour department store in Little India selling just about everything.',
   '145 Syed Alwi Rd, Singapore 207704',
   null, null, true,
   1.3100, 103.8558, 'Enter via Entrance 2 on Syed Alwi Road', '#01-100'),
  ('10000000-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   'National Museum of Singapore',
   'The nation''s oldest museum, tracing Singapore''s history and culture.',
   '93 Stamford Rd, Singapore 178897',
   '10:00', '19:00', false,
   1.2966, 103.8485, '5-minute walk from Bras Basah MRT Exit B', '#01-01'),
  ('10000000-0000-0000-0000-000000000006',
   '11111111-1111-1111-1111-111111111111',
   'Tiong Bahru Bakery',
   'Artisanal bakery and cafe known for its croissants in a heritage estate.',
   '56 Eng Hoon St, #01-70, Singapore 160056',
   '08:00', '20:00', false,
   1.2848, 103.8329, 'Across from Tiong Bahru Market', '#01-70')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Listing tags (resolve tag ids by name from the migration-seeded tags).
-- ---------------------------------------------------------------------------
insert into public.listing_tags (listing_id, tag_id)
select v.listing_id, t.id
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Scenic Views'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Waterfront'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'Street Food'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'Local Cuisine'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'Wildlife & Nature'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'Family Friendly'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'Unique Experience'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'Budget Friendly'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'Historical Site'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'Arts & Culture'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'Café & Coffee'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'Hidden Gem')
) as v(listing_id, tag_name)
join public.tags t on t.tag_name = v.tag_name
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Tourist interests (so the recommendation engine returns results).
-- ---------------------------------------------------------------------------
insert into public.tourist_tags (profile_id, tag_id)
select '22222222-2222-2222-2222-222222222222', t.id
from public.tags t
where t.tag_name in ('Local Cuisine', 'Scenic Views', 'Historical Site', 'Café & Coffee')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. A starter itinerary for the tourist, with two UNSCHEDULED stops. Null
--    times are intentional: the valid_itinerary_time CHECK and the
--    operating-hours trigger both skip pending (null-time) stops, and the
--    "Generate AI Schedule" feature is there to fill them in.
-- ---------------------------------------------------------------------------
insert into public.itineraries (id, profile_id, itinerary_name)
values ('30000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'Weekend in Singapore')
on conflict (id) do nothing;

insert into public.itinerary_listings (itinerary_id, listing_id)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003')
on conflict do nothing;

-- ===========================================================================
-- 7. ANALYTICS SEED DATA
--
-- 12 extra tourist accounts + 45 days of listing views + saves spread across
-- multiple itineraries. This populates the business-owner Insights dashboard
-- with realistic data:  stat cards, per-listing table, time-series chart,
-- and audience-tags panel (which needs ≥10 distinct savers to unlock).
-- ===========================================================================

-- ── 7a. Extra tourist auth.users ─────────────────────────────────────────────
-- IDs use the pattern AAAAAAAA-...-00000000000N for easy identification.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
   'authenticated', 'authenticated', 'tourist02@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Bella Tan"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
   'authenticated', 'authenticated', 'tourist03@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Rivera"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004',
   'authenticated', 'authenticated', 'tourist04@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Diana Lim"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005',
   'authenticated', 'authenticated', 'tourist05@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ethan Goh"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006',
   'authenticated', 'authenticated', 'tourist06@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Fiona Wong"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007',
   'authenticated', 'authenticated', 'tourist07@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"George Tan"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008',
   'authenticated', 'authenticated', 'tourist08@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Hannah Lee"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009',
   'authenticated', 'authenticated', 'tourist09@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ivan Ng"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',
   'authenticated', 'authenticated', 'tourist10@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Julia Chen"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000b',
   'authenticated', 'authenticated', 'tourist11@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Kevin Ong"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000c',
   'authenticated', 'authenticated', 'tourist12@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Lisa Yeo"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000d',
   'authenticated', 'authenticated', 'tourist13@tourit.local',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Chua"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like 'tourist%@tourit.local'
  and u.id <> '22222222-2222-2222-2222-222222222222'  -- skip original tourist (already has identity)
on conflict do nothing;

-- ── 7b. Set all extra tourists as onboarded ──────────────────────────────────
update public.profiles
set role = 'tourist', onboarding_completed = true
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000004',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000005',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000006',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000007',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000008',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000009',
  'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',
  'aaaaaaaa-aaaa-aaaa-aaaa-00000000000b',
  'aaaaaaaa-aaaa-aaaa-aaaa-00000000000c',
  'aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'
);

-- ── 7c. Tourist tag preferences (diverse mix for audience panel) ─────────────
-- Each tourist gets 3-5 tags from the 15 available, creating a realistic
-- distribution for the audience-tags RPC.
insert into public.tourist_tags (profile_id, tag_id)
select v.profile_id, t.id
from (values
  -- Bella: foodie + culture
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, 'Local Cuisine'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, 'Street Food'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, 'Café & Coffee'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, 'Hidden Gem'),
  -- Carlos: adventure + nature
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, 'Scenic Views'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, 'Wildlife & Nature'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, 'Adventure & Sports'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, 'Waterfront'),
  -- Diana: culture + history
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, 'Historical Site'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, 'Arts & Culture'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, 'Local Craft'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, 'Unique Experience'),
  -- Ethan: family + budget
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid, 'Family Friendly'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid, 'Budget Friendly'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid, 'Wildlife & Nature'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid, 'Scenic Views'),
  -- Fiona: foodie + wellness
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid, 'Local Cuisine'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid, 'Café & Coffee'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid, 'Wellness & Relaxation'),
  -- George: culture + food
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid, 'Historical Site'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid, 'Local Cuisine'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid, 'Street Food'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid, 'Hidden Gem'),
  -- Hannah: nature + scenic
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid, 'Scenic Views'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid, 'Waterfront'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid, 'Wildlife & Nature'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid, 'Family Friendly'),
  -- Ivan: adventure + unique
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009'::uuid, 'Adventure & Sports'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009'::uuid, 'Unique Experience'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009'::uuid, 'Hidden Gem'),
  -- Julia: everything scenic + food
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid, 'Scenic Views'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid, 'Local Cuisine'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid, 'Waterfront'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid, 'Café & Coffee'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid, 'Historical Site'),
  -- Kevin: budget + street food
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid, 'Budget Friendly'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid, 'Street Food'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid, 'Local Cuisine'),
  -- Lisa: arts + wellness
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid, 'Arts & Culture'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid, 'Wellness & Relaxation'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid, 'Café & Coffee'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid, 'Hidden Gem'),
  -- Marcus: broad interests
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid, 'Scenic Views'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid, 'Local Cuisine'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid, 'Family Friendly'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid, 'Budget Friendly'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid, 'Unique Experience')
) as v(profile_id, tag_name)
join public.tags t on t.tag_name = v.tag_name
on conflict do nothing;

-- ── 7d. Listing views (45 days of traffic) ───────────────────────────────────
-- listing_views has REVOKE ALL FROM authenticated, but seed.sql runs as the
-- postgres superuser so direct inserts are fine.
--
-- Strategy: for each (listing, tourist) pair, generate views on a subset of
-- the last 45 days. Different listings get different "popularity" levels by
-- controlling which tourists visit and how many days they show up.
--
-- All 13 tourists (the original + 12 new).
-- The tourists array is crossed with dates and filtered to create varied patterns.

insert into public.listing_views (listing_id, viewer_id, viewed_on)
select listing_id, viewer_id, day::date
from (
  -- Marina Bay Sands: very popular — all 13 tourists visit, most days
  select
    '10000000-0000-0000-0000-000000000001'::uuid as listing_id,
    tourist_id as viewer_id,
    d.day
  from generate_series(
    (now() AT TIME ZONE 'Asia/Singapore')::date - 44,
    (now() AT TIME ZONE 'Asia/Singapore')::date,
    '1 day'
  ) as d(day)
  cross join (values
    ('22222222-2222-2222-2222-222222222222'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid)
  ) as tourists(tourist_id)
  -- Each tourist visits ~60% of days (pseudo-random based on hash)
  where abs(hashtext(tourist_id::text || d.day::text)) % 10 < 6

  union all

  -- Gardens by the Bay: popular — 10 tourists, ~50% of days
  select
    '10000000-0000-0000-0000-000000000003'::uuid,
    tourist_id,
    d.day
  from generate_series(
    (now() AT TIME ZONE 'Asia/Singapore')::date - 44,
    (now() AT TIME ZONE 'Asia/Singapore')::date,
    '1 day'
  ) as d(day)
  cross join (values
    ('22222222-2222-2222-2222-222222222222'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid)
  ) as tourists(tourist_id)
  where abs(hashtext(tourist_id::text || d.day::text)) % 10 < 5

  union all

  -- Newton Food Centre: moderate — 8 tourists, ~45% of days
  select
    '10000000-0000-0000-0000-000000000002'::uuid,
    tourist_id,
    d.day
  from generate_series(
    (now() AT TIME ZONE 'Asia/Singapore')::date - 44,
    (now() AT TIME ZONE 'Asia/Singapore')::date,
    '1 day'
  ) as d(day)
  cross join (values
    ('22222222-2222-2222-2222-222222222222'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid)
  ) as tourists(tourist_id)
  where abs(hashtext(tourist_id::text || d.day::text)) % 10 < 4

  union all

  -- National Museum: moderate — 7 tourists, ~40% of days
  select
    '10000000-0000-0000-0000-000000000005'::uuid,
    tourist_id,
    d.day
  from generate_series(
    (now() AT TIME ZONE 'Asia/Singapore')::date - 44,
    (now() AT TIME ZONE 'Asia/Singapore')::date,
    '1 day'
  ) as d(day)
  cross join (values
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid)
  ) as tourists(tourist_id)
  where abs(hashtext(tourist_id::text || d.day::text)) % 10 < 4

  union all

  -- Tiong Bahru Bakery: growing trend — 6 tourists, denser in recent 15 days
  select
    '10000000-0000-0000-0000-000000000006'::uuid,
    tourist_id,
    d.day
  from generate_series(
    (now() AT TIME ZONE 'Asia/Singapore')::date - 44,
    (now() AT TIME ZONE 'Asia/Singapore')::date,
    '1 day'
  ) as d(day)
  cross join (values
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid)
  ) as tourists(tourist_id)
  -- Older days (~25% chance), recent 15 days (~65% chance) = growth trend
  where (d.day >= (now() AT TIME ZONE 'Asia/Singapore')::date - 14
         AND abs(hashtext(tourist_id::text || d.day::text)) % 100 < 65)
     OR (d.day <  (now() AT TIME ZONE 'Asia/Singapore')::date - 14
         AND abs(hashtext(tourist_id::text || d.day::text)) % 100 < 25)

  union all

  -- Mustafa Centre: low but steady — 5 tourists, ~30% of days
  select
    '10000000-0000-0000-0000-000000000004'::uuid,
    tourist_id,
    d.day
  from generate_series(
    (now() AT TIME ZONE 'Asia/Singapore')::date - 44,
    (now() AT TIME ZONE 'Asia/Singapore')::date,
    '1 day'
  ) as d(day)
  cross join (values
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000b'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000c'::uuid),
    ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000d'::uuid)
  ) as tourists(tourist_id)
  where abs(hashtext(tourist_id::text || d.day::text)) % 10 < 3
) as views_data
on conflict do nothing;

-- ── 7e. Itineraries for each tourist (one per tourist) ───────────────────────
insert into public.itineraries (id, profile_id, itinerary_name)
values
  ('30000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'Bella''s Foodie Tour'),
  ('30000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'Carlos''s Adventure'),
  ('30000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004', 'Diana''s Culture Walk'),
  ('30000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005', 'Family Fun Day'),
  ('30000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000006', 'Fiona''s Favourites'),
  ('30000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000007', 'George''s History Trail'),
  ('30000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000008', 'Hannah''s Nature Day'),
  ('30000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000009', 'Ivan''s Hidden Gems'),
  ('30000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a', 'Julia''s Best of SG'),
  ('30000000-0000-0000-0000-00000000000b', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000b', 'Kevin''s Budget Trip'),
  ('30000000-0000-0000-0000-00000000000c', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000c', 'Lisa''s Art & Chill'),
  ('30000000-0000-0000-0000-00000000000d', 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000d', 'Marcus''s Highlights')
on conflict (id) do nothing;

-- ── 7f. Saves (itinerary_listings with backdated created_at) ─────────────────
-- Each tourist saves 2-4 listings to their itinerary. Timestamps are spread
-- over the last 40 days so the saves time-series shows realistic patterns.
-- The created_at column defaults to now(), so we override it via explicit value.
insert into public.itinerary_listings (itinerary_id, listing_id, created_at)
values
  -- Bella saves food spots (days -38, -25)
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '38 days'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006',
   now() - interval '25 days'),

  -- Carlos saves nature + views (days -42, -30, -12)
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   now() - interval '42 days'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() - interval '30 days'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006',
   now() - interval '12 days'),

  -- Diana saves culture spots (days -35, -20, -8)
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005',
   now() - interval '35 days'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003',
   now() - interval '8 days'),

  -- Ethan saves family-friendly (days -33, -18)
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003',
   now() - interval '33 days'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004',
   now() - interval '18 days'),

  -- Fiona saves food + bakery (days -28, -15, -3)
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002',
   now() - interval '28 days'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006',
   now() - interval '15 days'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
   now() - interval '3 days'),

  -- George saves culture + food (days -26, -14, -5)
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005',
   now() - interval '26 days'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002',
   now() - interval '14 days'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001',
   now() - interval '5 days'),

  -- Hannah saves nature (days -22, -10)
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001',
   now() - interval '22 days'),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003',
   now() - interval '10 days'),

  -- Ivan saves unique spots (days -19, -7)
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004',
   now() - interval '19 days'),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000006',
   now() - interval '7 days'),

  -- Julia saves broad mix (days -31, -17, -6, -1)
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001',
   now() - interval '31 days'),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002',
   now() - interval '17 days'),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000003',
   now() - interval '6 days'),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000006',
   now() - interval '1 day'),

  -- Kevin saves budget spots (days -24, -11)
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000004',
   now() - interval '24 days'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002',
   now() - interval '11 days'),

  -- Lisa saves arts + bakery (days -16, -4)
  ('30000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000005',
   now() - interval '16 days'),
  ('30000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000006',
   now() - interval '4 days'),

  -- Marcus saves highlights (days -27, -13, -2)
  ('30000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000001',
   now() - interval '27 days'),
  ('30000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000003',
   now() - interval '13 days'),
  ('30000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000005',
   now() - interval '2 days')
on conflict do nothing;
