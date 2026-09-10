import { redirect } from 'next/navigation';
import { getUserClient } from '@/lib/supabase';

export default async function OldCommunityProfileRedirect({ params }) {
  const supabase = getUserClient();
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
