-- pgTAP security suite for the business-owner analytics feature.
-- Run with: supabase test db
--
-- Codifies the invariants the analytics RPCs rely on: owners see only their own
-- data, the audience profile is withheld below the k-anonymity threshold and
-- never leaks an identity, listing_views is unreadable directly, and view
-- logging skips owners + dedupes per day.

begin;
select plan(14);

-- Create an auth user and set their profile role (the auth.users insert fires
-- the profile-creation trigger).
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

-- Act as a given user for the SECURITY DEFINER auth.uid() checks.
create function pg_temp.auth_as(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id)::text, true);
end;
$$;

-- === Setup: two owners with one listing each, and 10 savers of Listing A ===
select pg_temp.mk_user('aaaaaaaa-0000-0000-0000-000000000001', 'ownerA@t.local', 'business_owner');
select pg_temp.mk_user('bbbbbbbb-0000-0000-0000-000000000002', 'ownerB@t.local', 'business_owner');
select pg_temp.mk_user('cccccccc-0000-0000-0000-000000000003', 't1@t.local', 'tourist');

insert into public.listings (id, profile_id, listing_name, is_24_hours) values
  ('1a1a1a1a-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Listing A', true),
  ('1b1b1b1b-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Listing B', true);

do $$
declare i int; uid uuid; itin uuid; tag uuid;
begin
  select id into tag from public.tags where tag_name = 'Local Cuisine';
  for i in 1..9 loop
    uid := gen_random_uuid();
    perform pg_temp.mk_user(uid, 'sv' || i || '@t.local', 'tourist');
    insert into public.tourist_tags (profile_id, tag_id) values (uid, tag);
    itin := gen_random_uuid();
    insert into public.itineraries (id, profile_id, itinerary_name) values (itin, uid, 'Trip');
    insert into public.itinerary_listings (itinerary_id, listing_id)
      values (itin, '1a1a1a1a-0000-0000-0000-000000000001');
  end loop;
end $$;

-- T1 is the 10th saver of Listing A.
insert into public.tourist_tags (profile_id, tag_id)
  select 'cccccccc-0000-0000-0000-000000000003', id from public.tags where tag_name = 'Local Cuisine';
insert into public.itineraries (id, profile_id, itinerary_name)
  values ('dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000003', 'T1 Trip');
insert into public.itinerary_listings (itinerary_id, listing_id)
  values ('dddddddd-0000-0000-0000-000000000004', '1a1a1a1a-0000-0000-0000-000000000001');

-- === get_owner_listing_stats: self-scoping ===
select pg_temp.auth_as('aaaaaaaa-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from get_owner_listing_stats(current_date - 30, current_date)),
  1, 'owner A sees exactly one listing (their own)');
select is(
  (select listing_id from get_owner_listing_stats(current_date - 30, current_date) limit 1),
  '1a1a1a1a-0000-0000-0000-000000000001'::uuid, 'owner A sees Listing A, not Listing B');

select pg_temp.auth_as('bbbbbbbb-0000-0000-0000-000000000002');
select is(
  (select count(*)::int from get_owner_listing_stats(current_date - 30, current_date)),
  1, 'owner B sees only their own listing');

-- === get_owner_views_timeseries: no cross-owner leak ===
select pg_temp.auth_as('aaaaaaaa-0000-0000-0000-000000000001');
select is(
  (select coalesce(sum(views + saves), 0)::int
     from get_owner_views_timeseries('1b1b1b1b-0000-0000-0000-000000000002', current_date - 6, current_date)),
  0, 'owner A gets an all-zero series for a listing they do not own');

-- === get_owner_audience_tags: k-gate + privacy ===
select is(
  (get_owner_audience_tags('1a1a1a1a-0000-0000-0000-000000000001') ->> 'saver_count')::int,
  10, 'audience counts 10 distinct savers');
select is(
  jsonb_typeof(get_owner_audience_tags('1a1a1a1a-0000-0000-0000-000000000001') -> 'tags'),
  'array', 'tag distribution is present at 10 savers (>= k)');
select is(
  get_owner_audience_tags('1a1a1a1a-0000-0000-0000-000000000001')::text like '%profile_id%',
  false, 'audience payload never contains a profile_id');

delete from public.itinerary_listings
  where ctid in (select ctid from public.itinerary_listings
                 where listing_id = '1a1a1a1a-0000-0000-0000-000000000001' limit 1);
select is(
  jsonb_typeof(get_owner_audience_tags('1a1a1a1a-0000-0000-0000-000000000001') -> 'tags'),
  'null', 'tag distribution is withheld below k = 10');

-- === listing_views: default-deny (grant revoked + RLS on, no policies) ===
select is(has_table_privilege('authenticated', 'public.listing_views', 'SELECT'), false,
  'authenticated has no SELECT grant on listing_views');
select is(has_table_privilege('authenticated', 'public.listing_views', 'INSERT'), false,
  'authenticated has no INSERT grant on listing_views');
select is((select relrowsecurity from pg_class where oid = 'public.listing_views'::regclass), true,
  'RLS is enabled on listing_views');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'listing_views'),
  0, 'listing_views has zero policies (default-deny)');

-- === log_listing_view: dedupe + owner self-view skip ===
select pg_temp.auth_as('cccccccc-0000-0000-0000-000000000003');
select log_listing_view('1a1a1a1a-0000-0000-0000-000000000001');
select log_listing_view('1a1a1a1a-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from public.listing_views
     where listing_id = '1a1a1a1a-0000-0000-0000-000000000001'
       and viewer_id = 'cccccccc-0000-0000-0000-000000000003'),
  1, 'repeat views the same day dedupe to a single row');

select pg_temp.auth_as('aaaaaaaa-0000-0000-0000-000000000001');
select log_listing_view('1a1a1a1a-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from public.listing_views
     where listing_id = '1a1a1a1a-0000-0000-0000-000000000001'
       and viewer_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0, 'the listing owner viewing their own listing is not logged');

select * from finish();
rollback;
