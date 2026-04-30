import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [copyingResult, copiedByResult] = await Promise.all([
      supabase
        .from('active_copies')
        .select('id, target_user_id, started_at, performance_pct')
        .eq('copier_id', user.id)
        .eq('is_active', true)
        .order('started_at', { ascending: false }),
      supabase
        .from('active_copies')
        .select('id, copier_id, started_at, performance_pct')
        .eq('target_user_id', user.id)
        .eq('is_active', true)
        .order('started_at', { ascending: false }),
    ]);

    if (copyingResult.error) {
      return NextResponse.json({ error: copyingResult.error.message }, { status: 500 });
    }
    if (copiedByResult.error) {
      return NextResponse.json({ error: copiedByResult.error.message }, { status: 500 });
    }

    const copyingRows = copyingResult.data || [];
    const copiedByRows = copiedByResult.data || [];

    const allUserIds = [
      ...new Set([
        ...copyingRows.map((r) => r.target_user_id),
        ...copiedByRows.map((r) => r.copier_id),
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
          (p.full_name || p.user_settings?.display_name || p.username || 'Member').trim(),
        ])
      );
    }

    return NextResponse.json({
      copying: copyingRows.map((c) => ({
        ...c,
        target_name: nameMap[c.target_user_id] || 'Member',
      })),
      copiedBy: copiedByRows.map((c) => ({
        ...c,
        copier_name: nameMap[c.copier_id] || 'Member',
      })),
    });
  } catch (e) {
    console.error('GET active-copies', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const copyId = typeof body?.copy_id === 'string' ? body.copy_id.trim() : '';
    if (!copyId || body?.action !== 'stop') {
      return NextResponse.json({ error: 'copy_id and action=stop required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: copyRow } = await supabase
      .from('active_copies')
      .select('id, copier_id, target_user_id, is_active')
      .eq('id', copyId)
      .maybeSingle();

    if (!copyRow) {
      return NextResponse.json({ error: 'Copy not found' }, { status: 404 });
    }

    if (!copyRow.is_active) {
      return NextResponse.json({ error: 'Copy already stopped' }, { status: 409 });
    }

    if (copyRow.copier_id !== user.id && copyRow.target_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to stop this copy' }, { status: 403 });
    }

    const { error: stopErr } = await supabaseAdmin
      .from('active_copies')
      .update({
        is_active: false,
        stopped_at: new Date().toISOString(),
        stopped_by: user.id,
      })
      .eq('id', copyId);

    if (stopErr) {
      console.error('active_copies stop', stopErr);
      return NextResponse.json({ error: stopErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH active-copies', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
