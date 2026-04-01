import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';

export default async function OldCommunityProfileRedirect({ params }) {
  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', params.userId)
    .maybeSingle();

  if (profile?.username) {
    redirect(`/profile/${profile.username}`);
  }
  redirect('/community');
}
