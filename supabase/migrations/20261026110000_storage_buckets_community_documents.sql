-- Buckets the code uses that do not exist live (QA MIG-2).
--
-- community-images: written from the browser by the community composers
--   (EvoComposer + the legacy composers) at `<uid>/<timestamp>-<name>`
--   (see buildCommunityImagePath in src/lib/community-utils.js). Public read,
--   owner-only insert/delete under the caller's own uid folder.
-- documents: partner-application ID / financial documents. Written and read
--   only by src/app/api/partner-application/documents/route.js through the
--   service-role client, so the bucket is private with NO policies
--   (service role only). The MIME list mirrors that route's ALLOWED_MIME
--   (pdf, jpeg, png, webp, heic) so the route's own validation and the bucket
--   agree; the 10 MB cap mirrors MAX_FILE_BYTES.
--
-- Idempotent: on conflict do nothing, drop policy if exists.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('community-images', 'community-images', true, 5242880,
     array['image/png','image/jpeg','image/webp','image/gif']),
  ('documents', 'documents', false, 10485760,
     array['application/pdf','image/png','image/jpeg','image/webp','image/heic'])
on conflict (id) do nothing;

-- community-images: public read, owner writes under <uid>/...
drop policy if exists "community images public read" on storage.objects;
create policy "community images public read" on storage.objects
  for select using (bucket_id = 'community-images');

drop policy if exists "community images owner insert" on storage.objects;
create policy "community images owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "community images owner delete" on storage.objects;
create policy "community images owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- documents: private; no policies => service role only (partner applications).

-- Verification (read-only):
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets
--    where id in ('community-images','documents');
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like 'community images%';
