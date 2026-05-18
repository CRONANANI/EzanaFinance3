import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

const admin = getAdminClient();

/** POST { post_id, action: 'like' | 'unlike' } */
export async function POST(request) {
  try {
    const body = await request.json();
    const post_id = body.post_id;
    const action = body.action;

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }
    if (action !== 'like' && action !== 'unlike') {
      return NextResponse.json({ error: 'action must be like or unlike' }, { status: 400 });
    }

    const { user, client: supabase } = await requireUser(request);

    if (action === 'like') {
      const { error } = await supabase.from('post_likes').insert({ user_id: user.id, post_id });
      if (error && !error.message?.includes('duplicate') && error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!error) {
        try {
          const { data: postRow } = await admin
            .from('community_posts')
            .select('user_id, content')
            .eq('id', post_id)
            .maybeSingle();
          if (postRow?.user_id && postRow.user_id !== user.id) {
            await admin
              .from('activity_breadcrumbs')
              .insert({
                user_id: user.id,
                event_type: 'post_like',
                event_data: { post_id, author_id: postRow.user_id },
              })
              .catch(() => {});
            await awardXP(postRow.user_id, 5, 'Received a like on your post', 'community');

            // ── Notify post author of like ──
            try {
              const { data: authorPref } = await admin
                .from('user_interest_profiles')
                .select('notification_prefs')
                .eq('user_id', postRow.user_id)
                .maybeSingle();
              const prefs = authorPref?.notification_prefs || {};
              if (prefs.community_interactions !== false) {
                let likerName = 'Someone';
                const { data: likerProfile } = await admin
                  .from('profiles')
                  .select('full_name, user_settings')
                  .eq('id', user.id)
                  .maybeSingle();
                if (likerProfile) {
                  likerName =
                    (
                      likerProfile.full_name ||
                      likerProfile.user_settings?.display_name ||
                      ''
                    ).trim() || 'Someone';
                }

                const body = postRow.content || '';
                await admin.from('user_notifications').insert({
                  user_id: postRow.user_id,
                  type: 'community',
                  title: `${likerName} liked your post`,
                  content: `${body.slice(0, 80)}${body.length > 80 ? '…' : ''}`,
                });
              }
            } catch (notifErr) {
              console.error('[like] notification insert:', notifErr);
            }
          }
        } catch (e) {
          console.error('like: awardXP', e);
        }
      }
    } else {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: row } = await supabase
      .from('community_posts')
      .select('likes_count')
      .eq('id', post_id)
      .single();

    return NextResponse.json({ success: true, likes_count: row?.likes_count ?? 0 });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
