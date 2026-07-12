import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STALE_DAYS = 90;
const STALE_MS = STALE_DAYS * 86400000;

/*
 * GET /api/org/research-notes/coverage-lineage?ticker=
 *  - with ticker: the analyst→analyst handoff chain for that name, each hop's
 *    handoff packet, plus a stale-coverage flag (>90d since last doc).
 *  - without ticker: an overview row per covered ticker (current analyst, last
 *    doc date, doc count, stale flag) so the 1c view can list coverage.
 * Performance context comes from org_pitches (expected return / status) — we do
 * NOT fabricate realized returns.
 */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const ticker = (new URL(request.url).searchParams.get('ticker') || '').toUpperCase().trim();
    const now = Date.now();

    // Member directory (id → name/role) for resolving from/to member ids.
    const { data: members } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role')
      .eq('org_id', member.org_id);
    const memberById = new Map((members || []).map((m) => [m.id, m]));
    const memberName = (mid) => (mid && memberById.get(mid)?.display_name) || null;
    const memberRole = (mid) => (mid && memberById.get(mid)?.role) || null;

    // Pitch performance context keyed by ticker (latest pitch per ticker).
    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('ticker, analyst_member_id, expected_return_pct, status, decision, created_at')
      .eq('org_id', member.org_id);
    const pitchByTicker = new Map();
    for (const p of pitches || []) {
      const key = (p.ticker || '').toUpperCase();
      const prev = pitchByTicker.get(key);
      if (!prev || new Date(p.created_at) > new Date(prev.created_at)) pitchByTicker.set(key, p);
    }

    if (ticker) {
      const { data: chain } = await supabase
        .from('org_coverage_lineage')
        .select('*')
        .eq('org_id', member.org_id)
        .eq('ticker', ticker)
        .order('created_at', { ascending: true });

      // Handoff packet titles.
      const noteIds = [...new Set((chain || []).map((c) => c.handoff_note_id).filter(Boolean))];
      let noteById = new Map();
      if (noteIds.length) {
        const { data: notes } = await supabase
          .from('org_research_notes')
          .select('id, title, status, created_at')
          .in('id', noteIds);
        noteById = new Map((notes || []).map((n) => [n.id, n]));
      }

      // Last doc date for this ticker → stale flag.
      const { data: lastDoc } = await supabase
        .from('org_research_notes')
        .select('created_at')
        .eq('org_id', member.org_id)
        .ilike('ticker', ticker)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastDocAt = lastDoc && lastDoc[0]?.created_at ? lastDoc[0].created_at : null;
      const stale = lastDocAt ? now - new Date(lastDocAt).getTime() > STALE_MS : true;

      const hops = (chain || []).map((c) => ({
        id: c.id,
        term: c.term,
        created_at: c.created_at,
        from: c.from_member_id
          ? {
              id: c.from_member_id,
              name: memberName(c.from_member_id),
              role: memberRole(c.from_member_id),
            }
          : null,
        to: c.to_member_id
          ? {
              id: c.to_member_id,
              name: memberName(c.to_member_id),
              role: memberRole(c.to_member_id),
            }
          : null,
        handoff: c.handoff_note_id
          ? { id: c.handoff_note_id, ...(noteById.get(c.handoff_note_id) || {}) }
          : null,
      }));

      const p = pitchByTicker.get(ticker) || null;
      return NextResponse.json({
        ticker,
        hops,
        lastDocAt,
        stale,
        staleDays: STALE_DAYS,
        performance: p
          ? {
              expected_return_pct: p.expected_return_pct,
              status: p.status,
              decision: p.decision,
              analyst: memberName(p.analyst_member_id),
            }
          : null,
        canManage: assertOrgRole(member, MANAGER_ROLES),
      });
    }

    // Overview: one row per covered ticker.
    const { data: allChains } = await supabase
      .from('org_coverage_lineage')
      .select('ticker, to_member_id, from_member_id, created_at')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: true });

    // Doc counts + last doc per ticker.
    const { data: docs } = await supabase
      .from('org_research_notes')
      .select('ticker, created_at')
      .eq('org_id', member.org_id)
      .not('ticker', 'is', null);

    const byTicker = new Map();
    for (const c of allChains || []) {
      const key = (c.ticker || '').toUpperCase();
      if (!key) continue;
      const row = byTicker.get(key) || {
        ticker: key,
        currentAnalyst: null,
        hops: 0,
        lastDocAt: null,
        docCount: 0,
      };
      row.hops += 1;
      row.currentAnalyst = c.to_member_id ? memberName(c.to_member_id) : row.currentAnalyst;
      byTicker.set(key, row);
    }
    for (const d of docs || []) {
      const key = (d.ticker || '').toUpperCase();
      if (!key) continue;
      const row = byTicker.get(key) || {
        ticker: key,
        currentAnalyst: null,
        hops: 0,
        lastDocAt: null,
        docCount: 0,
      };
      row.docCount += 1;
      if (!row.lastDocAt || new Date(d.created_at) > new Date(row.lastDocAt))
        row.lastDocAt = d.created_at;
      byTicker.set(key, row);
    }

    const tickers = [...byTicker.values()]
      .map((r) => ({
        ...r,
        stale: r.lastDocAt ? now - new Date(r.lastDocAt).getTime() > STALE_MS : true,
        expected_return_pct: pitchByTicker.get(r.ticker)?.expected_return_pct ?? null,
      }))
      .sort((a, b) => Number(b.stale) - Number(a.stale) || a.ticker.localeCompare(b.ticker));

    return NextResponse.json({
      tickers,
      staleDays: STALE_DAYS,
      canManage: assertOrgRole(member, MANAGER_ROLES),
    });
  },
  { requireAuth: true },
);

/* POST — record a coverage handoff (managers only, per RLS). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json(
        { error: 'Only faculty / PMs can record handoffs' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const ticker = (body?.ticker || '').toUpperCase().trim();
    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 });

    const { data, error } = await supabase
      .from('org_coverage_lineage')
      .insert({
        org_id: member.org_id,
        ticker: ticker.slice(0, 12),
        from_member_id: body?.from_member_id || null,
        to_member_id: body?.to_member_id || null,
        handoff_note_id: body?.handoff_note_id || null,
        term: body?.term ? String(body.term).slice(0, 40) : null,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lineage: data });
  },
  { requireAuth: true },
);
