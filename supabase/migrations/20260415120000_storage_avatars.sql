-- Public read + authenticated upload/update for user avatar files under avatars/{user_id}/
-- Create the `avatars` bucket in the Supabase dashboard (Storage → New bucket → name: avatars → Public).

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );
