-- Public bucket for listing photos. Created via migration (not config.toml) so
-- local `db reset` and prod `db push` produce identical state.
--
-- public = true → files are served unauthenticated from
-- /storage/v1/object/public/listing-images/<path> and are CDN-cacheable. No
-- SELECT policy is needed for that read path. Venue photos are public
-- marketing content, so this is intentional.
--
-- Bucket-level limits are enforced by the Storage API server-side, so client
-- validation can be bypassed without consequence:
--   file_size_limit    5 MB (5242880 bytes)
--   allowed_mime_types jpeg + png only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Object paths follow <listing_id>/<random-uuid>.<ext>. Ownership of the
-- first path segment's listing gates writes — same ownership-via-parent shape
-- as the listing_tags policies.
create policy "Listing owners can upload listing images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.listings where profile_id = auth.uid()
  )
);

create policy "Listing owners can delete listing images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.listings where profile_id = auth.uid()
  )
);