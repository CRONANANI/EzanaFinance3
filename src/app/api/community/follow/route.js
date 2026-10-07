import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { resend } from '@/lib/services/resend';
import { escapeHtml } from '@/lib/sanitize';
import { emailFooterHtml } from '@/lib/email/footer';
import { listUnsubscribeHeaders, unsubscribeUrl } from '@/lib/email/unsubscribe';
import { awardXP } from '@/lib/rewards';
import { insertNotificationAndPush } from '@/lib/push/fanout';

export const dynamic = 'force-dynamic';

const admin = getAdminClient();

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

/** GET ?list=following — IDs the current user follows */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('list') !== 'following') {
      return NextResponse.json({ error: 'Unsupported list' }, { status: 400 });
    }

    const { user, client: supabase } = await requireUser(request);
    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      following: (data || []).map((row) => ({ id: row.following_id })),
    });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST { target_user_id, action: 'follow' | 'unfollow' } */
export async function POST(request) {
  try {
    const body = await request.json();
    const target_user_id = body.target_user_id;
    const action = body.action;

    if (!target_user_id || typeof target_user_id !== 'string') {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 });
    }
    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'action must be follow or unfollow' }, { status: 400 });
    }

    const { user, client: supabase } = await requireUser(request);

    if (user.id === target_user_id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    if (action === 'follow') {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: user.id,
        following_id: target_user_id,
      });

      let inserted = false;
      if (!error) {
        inserted = true;
      } else if (error.code === '23505') {
        inserted = false;
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (inserted) {
        let followerName = 'Someone';
        try {
          const { data: followerProfile } = await admin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          followerName =
            (followerProfile?.full_name && String(followerProfile.full_name).trim()) || 'Someone';

          const { data: authData, error: authErr } =
            await admin.auth.admin.getUserById(target_user_id);
          if (authErr) {
            console.error('follow: getUserById', authErr);
          }

          const toEmail = authData?.user?.email;
          /* A notification email, not transactional: only when the person has
             community emails on in Settings (off by default), with a one-click
             unsubscribe that works signed out. */
          const { data: targetProfile } = await admin
            .from('profiles')
            .select('user_settings')
            .eq('id', target_user_id)
            .maybeSingle();
          const wantsEmail = targetProfile?.user_settings?.notifications_email_community === true;
          if (process.env.RESEND_API_KEY && toEmail && wantsEmail) {
            const unsub = unsubscribeUrl(target_user_id, 'community');
            const safeName = escapeHtml(followerName);
            await resend.emails.send({
              from: 'Ezana Finance <noreply@ezana.world>',
              to: toEmail,
              subject: `${followerName} followed you on Ezana`,
              headers: listUnsubscribeHeaders(unsub),
              html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
          <h2 style="color: #10b981;">You have a new follower!</h2>
          <p style="color: #ccc; font-size: 16px;">
            <strong>${safeName}</strong> just followed you on Ezana Finance.
          </p>
          <p style="color: #888; font-size: 14px;">
            Head to the Community Center to follow them back and check out their profile.
            You'll earn XP toward your Community badges!
          </p>
          <a href="${SITE_ORIGIN}/community/profile/${user.id}" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View Their Profile
          </a>
          ${emailFooterHtml({
            unsubscribeUrl: unsub,
            unsubscribeLabel: 'Unsubscribe from community emails',
          })}
        </div>
      `,
            });
          }
        } catch (e) {
          console.error('follow: notification email', e);
        }

        // ── In-app notification: "[Name] started following you" ──
        try {
          await insertNotificationAndPush(admin, {
            user_id: target_user_id,
            title: `${followerName} started following you`,
            content: 'Check out their profile and follow them back to become friends!',
            type: 'community',
          });
        } catch (notifErr) {
          console.error('follow: notification insert', notifErr);
        }

        const { data: reciprocal } = await admin
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', target_user_id)
          .eq('following_id', user.id)
          .maybeSingle();

        if (reciprocal) {
          await awardXP(user.id, 25, 'Mutual follow (followed back)', 'community');
        }
      }
    } else {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', target_user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
