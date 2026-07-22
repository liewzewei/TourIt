-- One row per uploaded photo. A separate table (vs. text[] on listings) buys
-- ordering, future per-image metadata (alt text), and RLS consistent with
-- listing_tags.
--
-- Table GRANTs for authenticated/service_role are covered by the
-- ALTER DEFAULT PRIVILEGES in 20260704000000 — no explicit GRANT needed here.
create table public.listing_images (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  -- Storage object path within the listing-images bucket (NOT a full URL, so
  -- it survives a project-URL change): "<listing_id>/<uuid>.<ext>"
  image_path    text not null unique,
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);

create index listing_images_listing_order_idx
  on public.listing_images (listing_id, display_order);

alter table public.listing_images enable row level security;

create policy "Anyone can view listing images"
on public.listing_images for select
to authenticated
using (true);

create policy "Listing owners can insert listing images"
on public.listing_images for insert
to authenticated
with check (
  listing_id in (select id from public.listings where profile_id = auth.uid())
);

create policy "Listing owners can update listing images"
on public.listing_images for update
to authenticated
using (
  listing_id in (select id from public.listings where profile_id = auth.uid())
);

create policy "Listing owners can delete listing images"
on public.listing_images for delete
to authenticated
using (
  listing_id in (select id from public.listings where profile_id = auth.uid())
);