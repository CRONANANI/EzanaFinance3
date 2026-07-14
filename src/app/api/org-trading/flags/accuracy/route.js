import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONVICTION_SCORE = { low: 1, med: 2, high: 3 };

/**
 * GET /api/org-trading/flags/accuracy[?memberId=]
 *
 * Per-member Flag Accuracy — a SEPARATE recognition stat, deliberately NOT
 * merged into the Ezana Rating (flagging is a different skill from writing
 * theses; collapsing them destroys the information). Exposes flags raised,
 * accuracy %, the green/red split, average conviction, and — the honest one —
 * rejected-and-wrong: flags a member dismissed that turned out right.
 */
export const GET = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ members: [] });

    const { searchParams } = new URL(request.url);
    const memberFilter = searchParams.get('memberId');

    // Flags + their outcomes (org-public read).
    const { data: flags } = await supabase
      .from('org_position_flags')
      .select(
        'id, raiser_member_id, flag_color, conviction, raiser:org_members!org_position_flags_raiser_member_id_fkey(display_name, role, sub_role), outcome:org_flag_outcome(was_correct, score)',
      )
      .eq('org_id', member.org_id);

    // Rejections that turned out wrong (the raiser was right).
    const { data: rejections } = await supabase
      .from('org_flag_response')
      .select(
        'responder_member_id, response, flag_id, flag:org_position_flags(outcome:org_flag_outcome(was_correct))',
      )
      .eq('org_id', member.org_id)
      .eq('response', 'rejected');

    const byMember = new Map();
    const ensure = (id, row) => {
      if (!byMember.has(id)) {
        byMember.set(id, {
          member_id: id,
          display_name: row?.display_name || null,
          role: row?.role || null,
          sub_role: row?.sub_role || null,
          flags_raised: 0,
          green: 0,
          red: 0,
          scored: 0,
          correct: 0,
          conviction_sum: 0,
          conviction_n: 0,
          rejected_and_wrong: 0,
        });
      }
      return byMember.get(id);
    };

    for (const f of flags || []) {
      const m = ensure(f.raiser_member_id, f.raiser);
      m.flags_raised += 1;
      if (f.flag_color === 'green') m.green += 1;
      if (f.flag_color === 'red') m.red += 1;
      if (f.conviction && CONVICTION_SCORE[f.conviction]) {
        m.conviction_sum += CONVICTION_SCORE[f.conviction];
        m.conviction_n += 1;
      }
      const outcome = Array.isArray(f.outcome) ? f.outcome[0] : f.outcome;
      if (outcome && outcome.was_correct != null) {
        m.scored += 1;
        if (outcome.was_correct) m.correct += 1;
      }
    }

    for (const r of rejections || []) {
      const flag = Array.isArray(r.flag) ? r.flag[0] : r.flag;
      const outcome = flag && (Array.isArray(flag.outcome) ? flag.outcome[0] : flag.outcome);
      // The rejecter dismissed a flag whose raiser was proven right.
      if (outcome && outcome.was_correct === true) {
        const m = ensure(r.responder_member_id, null);
        m.rejected_and_wrong += 1;
      }
    }

    let members = Array.from(byMember.values()).map((m) => ({
      member_id: m.member_id,
      display_name: m.display_name,
      role: m.role,
      sub_role: m.sub_role,
      flags_raised: m.flags_raised,
      green: m.green,
      red: m.red,
      scored: m.scored,
      correct: m.correct,
      // HONEST-EMPTY: accuracy is null until at least one flag has been scored.
      accuracy_pct: m.scored > 0 ? Math.round((m.correct / m.scored) * 1000) / 10 : null,
      avg_conviction:
        m.conviction_n > 0 ? Math.round((m.conviction_sum / m.conviction_n) * 100) / 100 : null,
      rejected_and_wrong: m.rejected_and_wrong,
    }));

    if (memberFilter) members = members.filter((m) => m.member_id === memberFilter);
    members.sort((a, b) => (b.accuracy_pct ?? -1) - (a.accuracy_pct ?? -1));

    return NextResponse.json({ members });
  },
  { requireAuth: true },
);
