import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';
import { evaluateHoldings, evaluateProposal } from '@/lib/org-compliance-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/org/ips/check: evaluate a proposed pitch or idea against active
   IPS rules using the council's current holdings plus the proposed change.
   Nothing here stops a trade; the pitch form uses the result to refuse a
   submission that breaks a hard rule.
   Body: { ticker, sector?, side?, sizePct?, marketCap?, source_type?, source_id?, log? }
   Returns { passed, blocked, violations: [{ rule_id, rule_type, severity, detail }] }. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const ticker = (body?.ticker || '').toUpperCase().trim();

    // Active rules.
    const { data: rules } = await supabase
      .from('org_ips_rules')
      .select('*')
      .eq('org_id', member.org_id)
      .eq('is_active', true);

    // Current portfolio: the canonical org-scoped book (current_value and
    // ticker_symbol aliases feed the rule engine).
    const positions = await getOrgPositionBook(supabase, member.org_id);

    // Portfolio-monitor mode: read CURRENT holdings against each rule. Logs
    // nothing. Also returns sector weights so the page draws headroom from the
    // same market values the rules are read against.
    if (body?.mode === 'portfolio') {
      return NextResponse.json(evaluateHoldings({ rules: rules || [], positions }));
    }

    // The engine lives in org-compliance-model.js so the page's sample content
    // runs exactly the same rules.
    const { blocked, violations } = evaluateProposal({
      rules: rules || [],
      positions,
      ticker,
      sector: body?.sector || null,
      sizePct: body?.sizePct,
      marketCap: body?.marketCap,
    });

    // Optionally log violations (at real submission time).
    if (body?.log && violations.length > 0) {
      const rows = violations.map((x) => ({
        org_id: member.org_id,
        rule_id: x.rule_id,
        source_type: ['pitch', 'trade', 'portfolio'].includes(body?.source_type)
          ? body.source_type
          : 'pitch',
        source_id: body?.source_id || null,
        ticker: ticker || null,
        detail: x.detail,
        severity: x.severity,
      }));
      await supabase.from('org_ips_violations').insert(rows);
    }

    return NextResponse.json({ passed: !blocked, blocked, violations });
  },
  { requireAuth: true },
);
