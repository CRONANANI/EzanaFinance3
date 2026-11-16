/**
 * GET /api/org/company-research              the council's fund part
 * GET /api/org/company-research?ticker=NVDA  the council's records on one name
 *
 * Feeds the council sections of US Equities (/company-research). Every read
 * runs as the signed-in member through the RLS-scoped client and is scoped to
 * the member's own council; RLS stays the gate (private and team documents
 * the member cannot read never arrive). No service-role client is used.
 *
 * Fund part: the position book (getOrgPositionBook, the one source of truth
 * for holdings), sector teams, the member directory, sector coverage,
 * coverage handoffs, the stored policy rules, a light index of research
 * dates per ticker (for coverage gaps) and the latest fund snapshot's
 * benchmark. Ticker part: the documents and pitches on that name. The page
 * turns both into sections with src/lib/org-company-research-model.js.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const TICKER_RE = /^[A-Z0-9.-]{1,12}$/;

async function fundPart(supabase, member) {
  const orgId = member.org_id;
  const [positions, teams, members, coverage, hops, rules, notes, snap] = await Promise.all([
    getOrgPositionBook(supabase, orgId),
    supabase.from('org_teams').select('id, name').eq('org_id', orgId),
    supabase.from('org_members').select('id, user_id, display_name, role').eq('org_id', orgId),
    supabase
      .from('org_sector_coverage')
      .select('member_id, sector, is_primary')
      .eq('org_id', orgId),
    supabase
      .from('org_coverage_lineage')
      .select('ticker, to_member_id, created_at')
      .eq('org_id', orgId),
    supabase.from('org_ips_rules').select('*').eq('org_id', orgId),
    supabase
      .from('org_research_notes')
      .select('ticker, created_at')
      .eq('org_id', orgId)
      .not('ticker', 'is', null),
    supabase
      .from('org_fund_snapshots')
      .select('snapshot_date, benchmark_return_pct, benchmark_symbol, benchmark_source')
      .eq('org_id', orgId)
      .order('snapshot_date', { ascending: false })
      .limit(1),
  ]);
  /* The book, teams and rules carry the page; a failure there is an error.
     The rest only enrich it (names, coverage, gaps, benchmark). */
  const hard = [teams, rules].find((r) => r?.error);
  if (hard) return { error: hard.error };
  const last = snap?.data?.[0] || null;
  return {
    payload: {
      now: Date.now(),
      viewer: { role: member.role, memberId: member.id },
      positions,
      teams: teams.data || [],
      members: members.data || [],
      coverage: coverage.data || [],
      hops: hops.data || [],
      rules: rules.data || [],
      noteIndex: notes.data || [],
      benchmark: last
        ? {
            symbol: last.benchmark_symbol || null,
            source: last.benchmark_source || null,
            pct: last.benchmark_return_pct,
          }
        : null,
    },
  };
}

async function tickerPart(supabase, member, ticker) {
  const orgId = member.org_id;
  const [docs, pitches] = await Promise.all([
    supabase
      .from('org_research_notes')
      .select('id, ticker, title, doc_type, status, version, author_id, created_at, published_at')
      .eq('org_id', orgId)
      .ilike('ticker', ticker)
      .order('created_at', { ascending: false }),
    supabase
      .from('org_pitches')
      .select('*')
      .eq('org_id', orgId)
      .ilike('ticker', ticker)
      .order('created_at', { ascending: false }),
  ]);
  const failed = [docs, pitches].find((r) => r?.error);
  if (failed) return { error: failed.error };
  return {
    payload: {
      ticker,
      docs: docs.data || [],
      /* Only what the page shows: never ballots or tallies. */
      pitches: (pitches.data || []).map((p) => ({
        id: p.id,
        ticker: p.ticker,
        analyst_member_id: p.analyst_member_id ?? null,
        pitch_type: p.pitch_type ?? null,
        time_horizon: p.time_horizon ?? null,
        stage: p.stage ?? null,
        status: p.status ?? null,
        decision: p.decision ?? null,
        decision_at: p.decision_at ?? null,
        expected_return_pct: p.expected_return_pct ?? null,
        stage_entered_at: p.stage_entered_at ?? null,
        created_at: p.created_at,
      })),
    },
  };
}

export const GET = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const raw = new URL(request.url).searchParams.get('ticker');
    if (raw != null) {
      const ticker = String(raw).toUpperCase().trim();
      if (!TICKER_RE.test(ticker)) {
        return NextResponse.json({ error: 'A valid ticker is required' }, { status: 400 });
      }
      const { error, payload } = await tickerPart(supabase, member, ticker);
      if (error) return NextResponse.json({ error: 'Could not load' }, { status: 500 });
      return NextResponse.json(payload, { headers: PRIVATE });
    }

    const { error, payload } = await fundPart(supabase, member);
    if (error) return NextResponse.json({ error: 'Could not load' }, { status: 500 });
    return NextResponse.json(payload, { headers: PRIVATE });
  },
  { requireAuth: true },
);
