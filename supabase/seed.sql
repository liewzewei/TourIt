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
  open_time, close_time, is_24_hours
)
values
  ('10000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Marina Bay Sands SkyPark',
   'Observation deck with panoramic views over Marina Bay and the city skyline.',
   '10 Bayfront Ave, Singapore 018956',
   '09:30', '22:00', false),
  ('10000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Newton Food Centre',
   'Bustling hawker centre famous for chilli crab, satay and local favourites.',
   '500 Clemenceau Ave North, Singapore 229495',
   '16:00', '23:59', false),
  ('10000000-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Gardens by the Bay',
   'Futuristic nature park with the Supertree Grove and climate-controlled domes.',
   '18 Marina Gardens Dr, Singapore 018953',
   '09:00', '21:00', false),
  ('10000000-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111',
   'Mustafa Centre',
   'Sprawling 24-hour department store in Little India selling just about everything.',
   '145 Syed Alwi Rd, Singapore 207704',
   null, null, true),
  ('10000000-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   'National Museum of Singapore',
   'The nation''s oldest museum, tracing Singapore''s history and culture.',
   '93 Stamford Rd, Singapore 178897',
   '10:00', '19:00', false),
  ('10000000-0000-0000-0000-000000000006',
   '11111111-1111-1111-1111-111111111111',
   'Tiong Bahru Bakery',
   'Artisanal bakery and cafe known for its croissants in a heritage estate.',
   '56 Eng Hoon St, #01-70, Singapore 160056',
   '08:00', '20:00', false)
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
