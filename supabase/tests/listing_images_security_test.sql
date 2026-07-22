-- pgTAP security suite for the listing images feature.
-- Run with: supabase test db
--
-- Codifies the access-control invariants for listing photos: only a listing's
-- owner may attach/remove images (both the listing_images row and the
-- storage.objects file under the listing's folder), anyone signed in may read
-- them, deleting a listing cascades to its images, and recommend_listings
-- surfaces the first image (lowest display_order) as preview_image_path.
--
-- IMPORTANT: `supabase test db` runs as the postgres superuser, which BYPASSES
-- RLS. To actually exercise the policies we `set local role authenticated`
-- (the role the policies target) and drive auth.uid() via request.jwt.claims.
-- Fixture setup and ground-truth row counts run as the superuser (RLS off);
-- the policy assertions run as `authenticated` (RLS on).

begin;
select plan(13);

-- Create an auth user and set their profile role (the auth.users insert fires
-- the profile-creation trigger). Copied from analytics_security_test.sql.
create function pg_temp.mk_user(p_id uuid, p_email text, p_role text)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, 'x', now(), '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_email), now(), now(), '', '', '', '');
  update public.profiles set role = p_role, onboarding_completed = true where id = p_id;
end;
$$;

-- Point auth.uid() at a given user (transaction-scoped, survives across the
-- role switches below).
create function pg_temp.auth_as(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id)::text, true);
end;
$$;

-- === Setup (as superuser): two owners, one tourist, three listings ===
-- Listing A -> Owner A. Listings B and C -> Owner B; C is left image-less so we
-- can assert a NULL preview_image_path.
select pg_temp.mk_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ownerA@t.local', 'business_owner');
select pg_temp.mk_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ownerB@t.local', 'business_owner');
select pg_temp.mk_user('cccccccc-cccc-cccc-cccc-cccccccccccc', 'tourist@t.local', 'tourist');

insert into public.listings (id, profile_id, listing_name, is_24_hours) values
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner A listing', true),
  ('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner B listing', true),
  ('c3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner B image-less listing', true);

-- ===========================================================================
-- listing_images table RLS
-- ===========================================================================
set local role authenticated;
select pg_temp.auth_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- 1. Owner attaches an image to their OWN listing.
select lives_ok(
  $$ insert into public.listing_images (listing_id, image_path, display_order)
     values ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111/first.jpg', 0) $$,
  'owner can insert an image for their own listing');

-- 2. Owner attaches an image to ANOTHER owner's listing -> RLS violation.
select throws_ok(
  $$ insert into public.listing_images (listing_id, image_path, display_order)
     values ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222/x.jpg', 0) $$,
  '42501', NULL,
  'owner cannot insert an image for another owner''s listing');

-- 3. A tourist can READ images (the "Anyone can view" SELECT policy).
select pg_temp.auth_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select is(
  (select count(*)::int from public.listing_images),
  1, 'a signed-in tourist can read listing images');

-- 4. A tourist cannot INSERT images.
select throws_ok(
  $$ insert into public.listing_images (listing_id, image_path, display_order)
     values ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111/nope.jpg', 0) $$,
  '42501', NULL,
  'a tourist cannot insert listing images');

-- 5. A non-owner DELETE removes zero rows (RLS filters them out; no error).
select pg_temp.auth_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
delete from public.listing_images where listing_id = 'a1111111-1111-1111-1111-111111111111';
reset role;
select is(
  (select count(*)::int from public.listing_images where listing_id = 'a1111111-1111-1111-1111-111111111111'),
  1, 'a non-owner delete removes no listing_images rows');

-- 6. The owner CAN delete their own image.
set local role authenticated;
select pg_temp.auth_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
delete from public.listing_images where listing_id = 'a1111111-1111-1111-1111-111111111111';
reset role;
select is(
  (select count(*)::int from public.listing_images where listing_id = 'a1111111-1111-1111-1111-111111111111'),
  0, 'the listing owner can delete their own image');

-- ===========================================================================
-- storage.objects RLS  (paths are "<listing_id>/<file>"; the first path
-- segment must be a listing owned by auth.uid())
-- ===========================================================================
set local role authenticated;
select pg_temp.auth_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- 7. Owner uploads a file under their own listing's folder.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('listing-images', 'a1111111-1111-1111-1111-111111111111/x.jpg') $$,
  'owner can upload into their own listing folder');

-- 8. Owner uploads under ANOTHER owner's folder -> RLS violation.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('listing-images', 'b2222222-2222-2222-2222-222222222222/x.jpg') $$,
  '42501', NULL,
  'owner cannot upload into another owner''s listing folder');

-- 9. A tourist cannot upload at all.
select pg_temp.auth_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('listing-images', 'a1111111-1111-1111-1111-111111111111/y.jpg') $$,
  '42501', NULL,
  'a tourist cannot upload listing images');

-- 10. The DELETE policy that scopes file removal to the listing owner exists.
-- Its behavior can't be exercised from SQL: local Storage installs a
-- storage.protect_delete() trigger that blocks ALL direct DELETEs on
-- storage.objects ("Use the Storage API instead"), which raises before RLS is
-- even consulted. So we assert the owner-scoped authorization policy is present.
reset role;
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and cmd = 'DELETE'
       and policyname = 'Listing owners can delete listing images'),
  1, 'an owner-scoped DELETE policy exists on storage.objects');

-- ===========================================================================
-- Cascade + recommend_listings preview (schema behavior; superuser is fine)
-- ===========================================================================

-- 11. Deleting a listing cascades to its listing_images rows. Runs storage
-- tests first (above) so the ownership subquery still sees listing A.
insert into public.listing_images (listing_id, image_path, display_order)
  values ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111/cascade.jpg', 0);
delete from public.listings where id = 'a1111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from public.listing_images where listing_id = 'a1111111-1111-1111-1111-111111111111'),
  0, 'deleting a listing cascades to its listing_images');

-- 12/13. recommend_listings.preview_image_path is the lowest-display_order
-- image, or NULL when the listing has none. Insert order (1 before 0) is
-- deliberately the reverse of display_order to prove the ORDER BY, not luck.
insert into public.listing_images (listing_id, image_path, display_order) values
  ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222/1.jpg', 1),
  ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222/0.jpg', 0);

set local role authenticated;
select pg_temp.auth_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select is(
  (select preview_image_path from recommend_listings(50, 0)
     where id = 'b2222222-2222-2222-2222-222222222222'),
  'b2222222-2222-2222-2222-222222222222/0.jpg',
  'preview_image_path is the lowest display_order image');
select is(
  (select preview_image_path from recommend_listings(50, 0)
     where id = 'c3333333-3333-3333-3333-333333333333'),
  NULL,
  'a listing with no images has a NULL preview_image_path');
reset role;

select * from finish();
rollback;
