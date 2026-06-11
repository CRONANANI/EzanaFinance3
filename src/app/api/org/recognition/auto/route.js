import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

const num = (v) => (v == null ? null : Number(v));

/* POST /api/org/recognition/auto — derive best-call + most-accurate from
   org_pitch_hindsight for the period. Manager-only. Idempotent per period. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* defaults below */
    }
    const period = (body?.period && String(body.period).slice(0, 40)) || currentPeriod();

    // Pitches for this org, with their analyst (author) member id.
    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('id, analyst_member_id, ticker, company_name')
      .eq('org_id', member.org_id);
    const pitchById = new Map((pitches || []).map((p) => [p.id, p]));
    const pitchIds = (pitches || []).map((p) => p.id);
    if (pitchIds.length === 0) {
      return NextResponse.json({ awarded: [], message: 'No pitches with outcomes yet.' });
    }

    // Hindsight outcomes for those pitches.
    const { data: hindsight } = await supabase
      .from('org_pitch_hindsight')
      .select('pitch_id, alpha_pct, return_pct')
      .in('pitch_id', pitchIds);

    // Resolve analyst member ids -> user ids (recognition recipients).
    const { data: members } = await supabase
      .from('org_members')
      .select('id, user_id, display_name')
      .eq('org_id', member.org_id)
      .eq('is_active', true);
    const userByMemberId = new Map((members || []).map((m) => [m.id, m]));

    // ── Best call: highest alpha_pct ────────────────────────────────────────
    let best = null;
    for (const h of hindsight || []) {
      const alpha = num(h.alpha_pct);
      if (alpha == null) continue;
      if (!best || alpha > best.alpha) best = { alpha, pitch: pitchById.get(h.pitch_id) };
    }

    // ── Most accurate: highest hit-rate (alpha > 0) across a member's pitches ─
    const perAnalyst = new Map(); // memberId -> { hits, total }
    for (const h of hindsight || []) {
      const p = pitchById.get(h.pitch_id);
      if (!p?.analyst_member_id) continue;
      const a = perAnalyst.get(p.analyst_member_id) || { hits: 0, total: 0 };
      a.total += 1;
      const metric = num(h.alpha_pct) ?? num(h.return_pct);
      if (metric != null && metric > 0) a.hits += 1;
      perAnalyst.set(p.analyst_member_id, a);
    }
    let mostAccurate = null;
    for (const [memberId, a] of perAnalyst.entries()) {
      if (a.total < 1) continue;
      const rate = a.hits / a.total;
      if (!mostAccurate || rate > mostAccurate.rate) {
        mostAccurate = { memberId, rate, hits: a.hits, total: a.total };
      }
    }

    // Existing auto badges for this period (idempotency — skip duplicates).
    const { data: existing } = await supabase
      .from('org_recognition')
      .select('badge_type')
      .eq('org_id', member.org_id)
      .eq('period', period)
      .eq('auto_generated', true);
    const have = new Set((existing || []).map((e) => e.badge_type));

    const toInsert = [];

    if (best?.pitch?.analyst_member_id && !have.has('best_call')) {
      const recip = userByMemberId.get(best.pitch.analyst_member_id);
      if (recip) {
        toInsert.push({
          org_id: member.org_id,
          recipient_id: recip.user_id,
          awarded_by: member.user_id,
          badge_type: 'best_call',
          title: `Best Call — ${best.pitch.ticker || best.pitch.company_name || 'Pitch'}`,
          reason: `Top alpha of ${best.alpha.toFixed(1)}% vs. benchmark on ${best.pitch.company_name || best.pitch.ticker}.`,
          period,
          auto_generated: true,
        });
      }
    }

    if (mostAccurate && !have.has('most_accurate')) {
      const recip = userByMemberId.get(mostAccurate.memberId);
      if (recip) {
        toInsert.push({
          org_id: member.org_id,
          recipient_id: recip.user_id,
          awarded_by: member.user_id,
          badge_type: 'most_accurate',
          title: 'Most Accurate Analyst',
          reason: `${mostAccurate.hits}/${mostAccurate.total} calls beat the benchmark (${Math.round(mostAccurate.rate * 100)}% hit rate).`,
          period,
          auto_generated: true,
        });
      }
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        awarded: [],
        period,
        message: 'Nothing new to award — already computed for this period or no outcome data.',
      });
    }

    const { data, error } = await supabase.from('org_recognition').insert(toInsert).select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ awarded: data, period });
  },
  { requireAuth: true },
);
