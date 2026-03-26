import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';
import { resend } from '@/lib/resend';
import { awardXP } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

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

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        try {
          const { data: followerProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          const followerName =
            (followerProfile?.full_name && String(followerProfile.full_name).trim()) || 'Someone';

          const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
          if (authErr) {
            console.error('follow: getUserById', authErr);
          }

          const toEmail = authData?.user?.email;
          if (process.env.RESEND_API_KEY && toEmail) {
            await resend.emails.send({
              from: 'Ezana Finance <noreply@ezana.world>',
              to: toEmail,
              subject: `${followerName} followed you on Ezana`,
              html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
          <h2 style="color: #10b981;">You have a new follower!</h2>
          <p style="color: #ccc; font-size: 16px;">
            <strong>${followerName}</strong> just followed you on Ezana Finance.
          </p>
          <p style="color: #888; font-size: 14px;">
            Head to the Community Center to follow them back and check out their profile.
            You'll earn XP toward your Community badges!
          </p>
          <a href="${SITE_ORIGIN}/community/profile/${user.id}" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            View Their Profile
          </a>
          <p style="color: #555; font-size: 12px; margin-top: 30px;">
            Ezana Finance · ezana.world
          </p>
        </div>
      `,
            });
          }
        } catch (e) {
          console.error('follow: notification email', e);
        }

        const { data: reciprocal } = await supabaseAdmin
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
