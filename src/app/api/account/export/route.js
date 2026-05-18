import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request) {
  let user;
  try {
    const auth = await requireUser(request);
    user = auth.user;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const [
    profileRes,
    breadcrumbsRes,
    watchlistsRes,
    itemsRes,
    notificationsRes,
    interestRes,
    postsRes,
    messagesRes,
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    admin
      .from('activity_breadcrumbs')
      .select('event_type, event_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5000),
    admin.from('user_watchlists').select('*').eq('user_id', user.id),
    admin.from('user_watchlist_items').select('*').eq('user_id', user.id).limit(5000),
    admin
      .from('user_notifications')
      .select('type, title, content, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000),
    admin.from('user_interest_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    admin
      .from('community_posts')
      .select('content, created_at, mentioned_ticker, likes_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('messages')
      .select('content, created_at, conversation_id')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: profileRes?.data || null,
    activity_breadcrumbs: breadcrumbsRes?.data || [],
    watchlists: watchlistsRes?.data || [],
    watchlist_items: itemsRes?.data || [],
    notifications: notificationsRes?.data || [],
    interest_profile: interestRes?.data || null,
    community_posts: postsRes?.data || [],
    messages: messagesRes?.data || [],
  };

  if (exportData.profile) {
    delete exportData.profile.is_disabled;
    delete exportData.profile.deletion_scheduled_for;
  }

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="ezana-data-export-${user.id}.json"`,
    },
  });
}
