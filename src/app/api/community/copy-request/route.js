import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';
import { awardELO } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COOLDOWN_DAYS = 30;
const MIN_ACCOUNT_AGE_DAYS = 7;
const ANNUAL_REQUEST_ELO_CAP = 500;

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [incomingResult, outgoingResult] = await Promise.all([
      supabase
        .from('copy_requests')
        .select('id, requester_id, status, message, created_at, resolved_at')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('copy_requests')
        .select('id, target_user_id, status, message, created_at, resolved_at')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (incomingResult.error) {
      return NextResponse.json({ error: incomingResult.error.message }, { status: 500 });
    }
    if (outgoingResult.error) {
      return NextResponse.json({ error: outgoingResult.error.message }, { status: 500 });
    }

    const incomingRows = incomingResult.data || [];
    const outgoingRows = outgoingResult.data || [];

    const allUserIds = [
      ...new Set([
        ...incomingRows.map((r) => r.requester_id),
        ...outgoingRows.map((r) => r.target_user_id),
      ]),
    ];

    let nameMap = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, user_settings')
        .in('id', allUserIds);
      nameMap = Object.fromEntries(
        (profiles || []).map((p) => [
          p.id,
          {
            name: (p.full_name || p.user_settings?.display_name || p.username || 'Member').trim(),
            username: p.username,
          },
        ])
      );
    }

    return NextResponse.json({
      incoming: incomingRows.map((r) => ({
        ...r,
        requester_name: nameMap[r.requester_id]?.name || 'Member',
        requester_username: nameMap[r.requester_id]?.username,
      })),
      outgoing: outgoingRows.map((r) => ({
        ...r,
        target_name: nameMap[r.target_user_id]?.name || 'Member',
        target_username: nameMap[r.target_user_id]?.username,
      })),
    });
  } catch (e) {
    console.error('GET copy-request', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const targetUserId = typeof body?.target_user_id === 'string' ? body.target_user_id.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.slice(0, 500) : null;

    if (!targetUserId) {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot request copy of own portfolio' }, { status: 400 });
    }

    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
    if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
      return NextResponse.json(
        {
          error: `Account must be at least ${MIN_ACCOUNT_AGE_DAYS} days old to send copy requests`,
          accountAgeDays: Math.floor(accountAgeDays),
        },
        { status: 403 }
      );
    }

    const { count: bronzeCount } = await supabaseAdmin
      .from('user_course_progress')
      .select('course_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('quiz_passed', true);

    if (!bronzeCount || bronzeCount < 1) {
      return NextResponse.json(
        { error: 'Must complete at least one course to send copy requests' },
        { status: 403 }
      );
    }

    const cooldownStart = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRequest } = await supabase
      .from('copy_requests')
      .select('id, status, created_at')
      .eq('requester_id', user.id)
      .eq('target_user_id', targetUserId)
      .gte('created_at', cooldownStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRequest) {
      return NextResponse.json(
        {
          error: `You already requested to copy this user in the last ${COOLDOWN_DAYS} days`,
          previousRequest: {
            id: recentRequest.id,
            status: recentRequest.status,
            created_at: recentRequest.created_at,
          },
        },
        { status: 409 }
      );
    }

    const { data: pendingOther } = await supabase
      .from('copy_requests')
      .select('id')
      .eq('requester_id', user.id)
      .eq('target_user_id', targetUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingOther) {
      return NextResponse.json({ error: 'A pending request to this user already exists' }, { status: 409 });
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('copy_requests')
      .insert({
        requester_id: user.id,
        target_user_id: targetUserId,
        status: 'pending',
        message,
      })
      .select()
      .single();

    if (insErr) {
      console.error('copy-request insert', insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const { data: targetElo } = await supabaseAdmin
      .from('user_elo')
      .select('lifetime_copy_requests, partner_eligible')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const newLifetime = (targetElo?.lifetime_copy_requests || 0) + 1;
    const becamePartnerEligible = !targetElo?.partner_eligible && newLifetime >= 100;

    const { error: eloUpdErr } = await supabaseAdmin
      .from('user_elo')
      .update({
        lifetime_copy_requests: newLifetime,
        ...(becamePartnerEligible && {
          partner_eligible: true,
          partner_eligible_at: new Date().toISOString(),
        }),
      })
      .eq('user_id', targetUserId);

    if (eloUpdErr) {
      console.error('copy-request user_elo update', eloUpdErr);
    }

    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: yearAwards } = await supabaseAdmin
      .from('elo_transactions')
      .select('delta')
      .eq('user_id', targetUserId)
      .eq('category', 'social')
      .eq('reason', 'Copy request received')
      .gte('created_at', yearStart);

    const yearAwardTotal = (yearAwards || []).reduce((sum, t) => sum + (t.delta || 0), 0);

    if (yearAwardTotal < ANNUAL_REQUEST_ELO_CAP) {
      const allowedDelta = Math.min(5, ANNUAL_REQUEST_ELO_CAP - yearAwardTotal);
      const eloResult = await awardELO(
        targetUserId,
        allowedDelta,
        'Copy request received',
        'social',
        { request_id: inserted.id, requester_id: user.id }
      );
      if (!eloResult) {
        console.warn('copy-request awardELO returned null for target', targetUserId);
      }
    }

    try {
      const { data: requesterProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, user_settings')
        .eq('id', user.id)
        .maybeSingle();
      const requesterName = (
        requesterProfile?.full_name ||
        requesterProfile?.user_settings?.display_name ||
        'Someone'
      ).trim();

      await supabaseAdmin.from('user_notifications').insert({
        user_id: targetUserId,
        title: `${requesterName} wants to copy your portfolio`,
        content: message || 'Review this request and decide whether to approve it.',
        type: 'community',
      });
    } catch (notifErr) {
      console.error('copy-request notification', notifErr);
    }

    return NextResponse.json({
      success: true,
      request: inserted,
      targetMilestone: becamePartnerEligible ? 'partner_eligible' : null,
    });
  } catch (e) {
    console.error('POST copy-request', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const requestId = typeof body?.request_id === 'string' ? body.request_id.trim() : '';
    const action = body?.action;

    if (!requestId || !['approve', 'reject', 'withdraw'].includes(action)) {
      return NextResponse.json({ error: 'request_id and valid action required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: req, error: fetchErr } = await supabase
      .from('copy_requests')
      .select('id, requester_id, target_user_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr || !req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (req.status !== 'pending') {
      return NextResponse.json({ error: 'Request already resolved' }, { status: 409 });
    }

    if (action === 'approve' || action === 'reject') {
      if (req.target_user_id !== user.id) {
        return NextResponse.json({ error: 'Only target can approve/reject' }, { status: 403 });
      }
    } else if (action === 'withdraw') {
      if (req.requester_id !== user.id) {
        return NextResponse.json({ error: 'Only requester can withdraw' }, { status: 403 });
      }
    }

    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'withdrawn';

    const { error: updErr } = await supabaseAdmin
      .from('copy_requests')
      .update({
        status: newStatus,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updErr) {
      console.error('copy-request PATCH update', updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (action === 'approve') {
      const { data: existingActive } = await supabaseAdmin
        .from('active_copies')
        .select('id')
        .eq('copier_id', req.requester_id)
        .eq('target_user_id', req.target_user_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!existingActive) {
        const { error: acErr } = await supabaseAdmin.from('active_copies').insert({
          copier_id: req.requester_id,
          target_user_id: req.target_user_id,
          request_id: req.id,
          is_active: true,
        });
        if (acErr) console.error('copy-request active_copies insert', acErr);
      }

      try {
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, user_settings')
          .eq('id', user.id)
          .maybeSingle();
        const targetName = (
          targetProfile?.full_name ||
          targetProfile?.user_settings?.display_name ||
          'They'
        ).trim();
        await supabaseAdmin.from('user_notifications').insert({
          user_id: req.requester_id,
          title: `${targetName} approved your copy request`,
          content: 'You can now mirror their portfolio strategy.',
          type: 'community',
        });
      } catch (notifErr) {
        console.error('copy-request approve notification', notifErr);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (e) {
    console.error('PATCH copy-request', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
