import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const INDUSTRIES = ['ib', 'pe', 'am', 'consulting', 'other'];
const FLAGS = ['guest_speaker', 'mentor', 'recruiter', 'donor'];
const FINANCE = ['ib', 'pe', 'am', 'consulting'];

/* GET /api/org/alumni?cohort_id=&industry=&flag= — the alumni directory.
   Frozen ratings come straight from org_alumni_records.final_rating (frozen at
   graduation from org_member_rating) — honest null when never frozen. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohort_id');
    const industry = searchParams.get('industry');
    const flag = searchParams.get('flag');

    let query = supabase
      .from('org_alumni_records')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });
    if (cohortId) query = query.eq('cohort_id', cohortId);
    if (industry && INDUSTRIES.includes(industry)) query = query.eq('employer_industry', industry);
    if (flag && FLAGS.includes(flag)) query = query.contains('engagement_flags', [flag]);

    const { data: records, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = records || [];
    const memberIds = rows.map((r) => r.member_id);
    let nameById = new Map();
    let coverageByMember = new Map();
    if (memberIds.length > 0) {
      const [{ data: mem }, { data: cov }] = await Promise.all([
        supabase.from('org_members').select('id, display_name, role, title').in('id', memberIds),
        supabase
          .from('org_sector_coverage')
          .select('member_id, sector')
          .eq('org_id', member.org_id)
          .in('member_id', memberIds),
      ]);
      nameById = new Map((mem || []).map((m) => [m.id, m]));
      for (const c of cov || []) {
        if (!coverageByMember.has(c.member_id)) coverageByMember.set(c.member_id, []);
        coverageByMember.get(c.member_id).push(c.sector);
      }
    }

    const alumni = rows.map((r) => {
      const m = nameById.get(r.member_id) || {};
      return {
        id: r.id,
        member_id: r.member_id,
        display_name: m.display_name || 'Alum',
        was_role: m.title || m.role || null,
        cohort_id: r.cohort_id,
        grad_term: r.grad_term || null,
        final_rating: r.final_rating != null ? Number(r.final_rating) : null,
        final_pitch_count: r.final_pitch_count != null ? Number(r.final_pitch_count) : null,
        employer: r.employer || null,
        employer_industry: r.employer_industry || null,
        role_title: r.role_title || null,
        linkedin_url: r.linkedin_url || null,
        placed_within_6mo: r.placed_within_6mo,
        engagement_flags: r.engagement_flags || [],
        sectors: coverageByMember.get(r.member_id) || [],
      };
    });

    // Stat strip: Total · Placement Rate · Top Sector · Engaged.
    const total = alumni.length;
    const placedFinance = alumni.filter(
      (a) => a.placed_within_6mo && FINANCE.includes(a.employer_industry),
    ).length;
    const engaged = alumni.filter((a) => (a.engagement_flags || []).length > 0).length;
    const sectorCounts = {};
    for (const a of alumni) for (const s of a.sectors) sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    const topSector = Object.entries(sectorCounts).sort((x, y) => y[1] - x[1])[0]?.[0] || null;

    return NextResponse.json({
      alumni,
      stats: {
        total,
        placement_rate_pct: total > 0 ? Math.round((placedFinance / total) * 100) : null,
        top_sector: topSector,
        engaged,
      },
      viewer: { memberId: member.id, canManage: MANAGER_ROLES.includes(member.role) },
      industries: INDUSTRIES,
      flags: FLAGS,
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/alumni — update (or create) an alumni record (manager only).
   When member_id is given and no record exists, a record is created and the
   final rating is FROZEN from org_member_rating at that moment (never fabricated
   — null when the member has no rating row). */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const editable = {};
    if ('employer' in body)
      editable.employer = body.employer ? String(body.employer).slice(0, 200) : null;
    if ('employer_industry' in body)
      editable.employer_industry = INDUSTRIES.includes(body.employer_industry)
        ? body.employer_industry
        : null;
    if ('role_title' in body)
      editable.role_title = body.role_title ? String(body.role_title).slice(0, 160) : null;
    if ('linkedin_url' in body)
      editable.linkedin_url = body.linkedin_url ? String(body.linkedin_url).slice(0, 400) : null;
    if ('placed_within_6mo' in body) editable.placed_within_6mo = !!body.placed_within_6mo;
    if ('grad_term' in body)
      editable.grad_term = body.grad_term ? String(body.grad_term).slice(0, 40) : null;
    if ('engagement_flags' in body && Array.isArray(body.engagement_flags)) {
      editable.engagement_flags = [
        ...new Set(body.engagement_flags.filter((f) => FLAGS.includes(f))),
      ];
    }

    // Update by record id.
    if (body?.id) {
      const { data, error } = await supabase
        .from('org_alumni_records')
        .update(editable)
        .eq('id', body.id)
        .eq('org_id', member.org_id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ record: data });
    }

    // Create for a member (freezing rating now) if no record yet.
    if (body?.member_id) {
      const { data: existing } = await supabase
        .from('org_alumni_records')
        .select('id')
        .eq('org_id', member.org_id)
        .eq('member_id', body.member_id)
        .maybeSingle();
      if (existing) {
        const { data, error } = await supabase
          .from('org_alumni_records')
          .update(editable)
          .eq('id', existing.id)
          .eq('org_id', member.org_id)
          .select('*')
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ record: data });
      }

      const { data: target } = await supabase
        .from('org_members')
        .select('id, cohort_id')
        .eq('id', body.member_id)
        .eq('org_id', member.org_id)
        .maybeSingle();
      if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

      const [{ data: rating }, { count: pitchCount }] = await Promise.all([
        supabase
          .from('org_member_rating')
          .select('rating')
          .eq('org_id', member.org_id)
          .eq('member_id', body.member_id)
          .maybeSingle(),
        supabase
          .from('org_pitches')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', member.org_id)
          .eq('analyst_member_id', body.member_id),
      ]);

      const { data, error } = await supabase
        .from('org_alumni_records')
        .insert({
          org_id: member.org_id,
          member_id: body.member_id,
          cohort_id: target.cohort_id || null,
          final_rating: rating?.rating != null ? Number(rating.rating) : null,
          final_pitch_count: pitchCount ?? 0,
          ...editable,
        })
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ record: data }, { status: 201 });
    }

    return NextResponse.json({ error: 'id or member_id required' }, { status: 400 });
  },
  { requireAuth: true },
);
