import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { mintJudgeToken } from '@/lib/competitions/judge-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TOKEN_TTL_DAYS = 30;

/* POST /api/org/pitch-competitions/:id/judges/:judgeId/token — host execs/PMs mint,
   regenerate, or revoke a judge's magic link. { action: 'generate' | 'revoke' }.
   Generate returns the raw link ONCE (only its hash is stored); regenerate mints a
   new one, invalidating the old. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id, judgeId } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data: comp } = await supabase.from('pitch_competitions').select('id, host_org_id').eq('id', id).maybeSingle();
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Only host executives and VPs can manage judge links.' }, { status: 403 });
    }

    // The judge must belong to this competition.
    const { data: judge } = await supabase
      .from('pitch_judges')
      .select('id, competition_id')
      .eq('id', judgeId)
      .eq('competition_id', comp.id)
      .maybeSingle();
    if (!judge) return NextResponse.json({ error: 'Judge not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const action = body?.action || 'generate';

    if (action === 'revoke') {
      const { error } = await supabase.from('pitch_judges').update({ token_revoked: true }).eq('id', judge.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, revoked: true });
    }

    if (action === 'generate') {
      const { raw, hash } = mintJudgeToken();
      const now = new Date();
      const expires = new Date(now.getTime() + TOKEN_TTL_DAYS * 86400000);
      const { error } = await supabase
        .from('pitch_judges')
        .update({
          token_hash: hash,
          token_issued_at: now.toISOString(),
          token_expires_at: expires.toISOString(),
          token_revoked: false,
        })
        .eq('id', judge.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      let origin = '';
      try {
        origin = new URL(request.url).origin;
      } catch {
        origin = '';
      }
      // The raw token is returned ONCE — it is never stored or retrievable again.
      return NextResponse.json({ ok: true, link: `${origin}/judge/${raw}`, expires_at: expires.toISOString() });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  },
  { requireAuth: true },
);
