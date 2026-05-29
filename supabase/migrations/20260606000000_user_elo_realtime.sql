-- Enable realtime for user_elo so profile/home ELO updates live on rating changes.

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'user_elo'
  ) then
    alter publication supabase_realtime add table public.user_elo;
  end if;
end $$;

notify pgrst, 'reload schema';
