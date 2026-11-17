/**
 * Sonar adaptive research: organization data for the council overlays (Nov 2026). Server only.
 *
 * Tenant rules, enforced here and not left to callers:
 *   1. The organization is never taken from the request. It is the caller's own active
 *      membership, resolved on the server from their verified session.
 *   2. Per-document data (pitches, council research reports) is read with a client bound to
 *      the caller's own session (getAuthContext: bearer token or cookie), so row-level
 *      security decides what this member may see, and
 *      every query is also filtered to the member's organization.
 *   3. Fund-level context (mandate, IPS rules, the position book) is read the way the
 *      research route already reads it: with the service client, scoped to the verified
 *      organization id (loadFundContext).
 *   4. Nothing here writes. Sonar does not attach, move, share or approve council documents.
 *
 * resolveOrgContext() returns null for a guest, for a member of no organization and for an
 * inactive member; the overlays then do not run.
 */
import { getAuthContext } from '@/lib/supabase';
import { getOrgMemberForUser } from '@/lib/org-trading-server';
import { loadFundContext } from '@/lib/org-sonar/fund-context';
import { VISIBILITY_LABEL, STATUS_LABEL } from '@/lib/org-sonar/reports';
import { fmp } from '@/lib/sonar/engine/sources-memo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {Request} request  the incoming request (for the caller's own token)
 * @param {{ id: string } | null} user  the verified session user, from getAuthUser()
 * @param {object} admin  the service client
 * @returns {Promise<null | { orgId, orgName, role, deps }>}
 */
export async function resolveOrgContext(request, user, admin) {
  if (!user?.id || !admin) return null;
  const member = await getOrgMemberForUser(admin, user.id, {
    select: 'id, org_id, user_id, role, team_id, is_active',
  }).catch(() => null);
  if (!member?.org_id || member.is_active === false || !UUID.test(member.org_id)) return null;
  /* Defence in depth: the row must be this user's. */
  if (member.user_id !== user.id) return null;
  const orgId = member.org_id;
  /* A client bound to the caller's own session (bearer token or cookie), so row-level
     security decides what this member may read. It must be the same user. */
  const ctx = await getAuthContext(request);
  const mine = ctx?.supabase || null;
  if (!mine || ctx.user?.id !== user.id) return null;

  const deps = {
    fund: () => loadFundContext(admin, orgId),
    /* Sector, industry and size for the mandate checks. Public company facts, no org data. */
    async companyFacts(ticker) {
      const rows = await fmp('profile', { symbol: String(ticker).toUpperCase() }, 4000);
      const p = Array.isArray(rows) ? rows[0] : rows;
      if (!p) return null;
      const cap = Number(p.marketCap ?? p.mktCap);
      return {
        ticker: String(ticker).toUpperCase(),
        name: p.companyName || null,
        sector: p.sector || null,
        industry: p.industry || null,
        marketCap: Number.isFinite(cap) && cap > 0 ? cap : null,
      };
    },
    /* Pitches this member may read (row-level security), in their organization only. */
    async pitches({ ticker = null } = {}) {
      let q = mine
        .from('org_pitches')
        .select(
          'id, ticker, company_name, pitch_type, stage, status, thesis_short, why_now, catalysts, risks, target_price, current_price_at_submission, expected_return_pct, time_horizon, decision, updated_at',
        )
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(25);
      if (ticker) q = q.eq('ticker', String(ticker).toUpperCase());
      const { data, error } = await q;
      if (error) return null;
      return (data || []).map((p) => ({
        id: p.id,
        ticker: p.ticker,
        company: p.company_name || null,
        type: p.pitch_type,
        stage: p.stage,
        status: p.status,
        thesis: p.thesis_short || null,
        whyNow: p.why_now || null,
        catalysts: Array.isArray(p.catalysts) ? p.catalysts.length : 0,
        risks: Array.isArray(p.risks) ? p.risks.length : 0,
        targetPrice: p.target_price == null ? null : Number(p.target_price),
        priceAtSubmission:
          p.current_price_at_submission == null ? null : Number(p.current_price_at_submission),
        horizon: p.time_horizon || null,
        decision: p.decision || null,
        updatedAt: p.updated_at ? String(p.updated_at).slice(0, 10) : null,
      }));
    },
    /* Council research reports this member may read (row-level security), their organization only. */
    async reports({ ticker = null, subject = null } = {}) {
      let q = mine
        .from('org_sonar_reports')
        .select('id, kind, title, question, ticker, sector, visibility, status, updated_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(25);
      const term = String(subject || '')
        .replace(/[%_,()*\\]/g, ' ')
        .trim()
        .slice(0, 80);
      if (ticker) q = q.eq('ticker', String(ticker).toUpperCase());
      else if (term.length >= 3) q = q.ilike('title', `%${term}%`);
      const { data, error } = await q;
      if (error) return null;
      return (data || []).map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title || r.question || 'Untitled report',
        ticker: r.ticker || null,
        visibility: VISIBILITY_LABEL[r.visibility] || r.visibility,
        status: STATUS_LABEL[r.status] || r.status,
        updatedAt: r.updated_at ? String(r.updated_at).slice(0, 10) : null,
      }));
    },
  };
  return { orgId, role: member.role || null, deps };
}
