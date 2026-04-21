-- ----------------------------------------------------------------------------
-- Avatars storage: robust RLS + idempotent bucket creation
-- ----------------------------------------------------------------------------
--
-- The original migration (20260415120000_storage_avatars.sql) assumed the
-- client would upload to `<uid>/avatar.<ext>` and the policies checked
-- `(storage.foldername(name))[1] = auth.uid()::text`.
--
-- The client was actually uploading to `avatars/<uid>/avatar.<ext>`, which
-- makes `foldername(name)[1] = 'avatars'` (a literal folder segment — not the
-- user id). That caused INSERT/UPDATE to be rejected by RLS on some paths,
-- producing the "Failed to upload photo" toast even when the bucket-owner
-- fallback let the bytes land on disk.
--
-- This migration:
--   1. Ensures the `avatars` bucket exists and is public (so getPublicUrl works).
--   2. Drops the old policies (if present) and re-creates them so that
--      EITHER `<uid>/...` OR `avatars/<uid>/...` paths are accepted for the
--      logged-in user — no orphaned files if someone uploaded under the old
--      layout before the client fix shipped.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read avatars"               on storage.objects;
drop policy if exists "Users can upload their own avatar"     on storage.objects;
drop policy if exists "Users can update their own avatar"     on storage.objects;
drop policy if exists "Users can delete their own avatar"     on storage.objects;

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
