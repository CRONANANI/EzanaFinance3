import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const num = (v) => (v == null ? null : Number(v));

/* POST /api/org/ips/check — evaluate a proposed pitch/trade against active IPS
   rules using the org's current team portfolio + the proposed change.
   Body: { ticker, sector?, side?, sizePct?, marketCap?, source_type?, source_id?, log? }
   Returns { passed, blocked, violations: [{ rule_id, rule_type, severity, detail }] }. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const ticker = (body?.ticker || '').toUpperCase().trim();
    const sector = body?.sector || null;
    const sizePct = num(body?.sizePct); // proposed allocation as % of fund
    const marketCap = num(body?.marketCap);

    // Active rules.
    const { data: rules } = await supabase
      .from('org_ips_rules')
      .select('*')
      .eq('org_id', member.org_id)
      .eq('is_active', true);

    // Current portfolio (org's teams).
    const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', member.org_id);
    const teamIds = (teams || []).map((t) => t.id);
    let positions = [];
    if (teamIds.length > 0) {
      const { data: pf } = await supabase
        .from('org_team_portfolios')
        .select('ticker_symbol, current_value, sector')
        .in('team_id', teamIds);
      positions = pf || [];
    }

    const totalValue = positions.reduce((s, p) => s + (Number(p.current_value) || 0), 0);
    const sectorValue = {};
    for (const p of positions) {
      if (p.sector) sectorValue[p.sector] = (sectorValue[p.sector] || 0) + (Number(p.current_value) || 0);
    }
    const alreadyHeld = positions.some((p) => (p.ticker_symbol || '').toUpperCase() === ticker);
    const positionCount = positions.length;

    // ── Portfolio-monitor mode: evaluate CURRENT holdings against each rule ──
    if (body?.mode === 'portfolio') {
      const maxOf = (arr) => (arr.length ? Math.max(...arr) : 0);
      const ruleStatus = (rules || []).map((rule) => {
        const v = rule.rule_value || {};
        const p = num(v.pct);
        let status = 'ok';
        let detail = 'Within policy.';
        switch (rule.rule_type) {
          case 'max_position_pct':
            if (p != null && totalValue > 0) {
              const top = maxOf(positions.map((x) => ((Number(x.current_value) || 0) / totalValue) * 100));
              detail = `Largest position ${top.toFixed(1)}% of ${p}% limit.`;
              if (top > p) { status = 'bad'; detail = `Largest position ${top.toFixed(1)}% exceeds ${p}% limit.`; }
              else if (top > p * 0.9) status = 'warn';
            }
            break;
          case 'max_sector_pct':
            if (p != null && totalValue > 0) {
              const top = maxOf(Object.values(sectorValue).map((val) => (val / totalValue) * 100));
              detail = `Largest sector ${top.toFixed(1)}% of ${p}% cap.`;
              if (top > p) { status = 'bad'; detail = `A sector is ${top.toFixed(1)}%, over the ${p}% cap.`; }
              else if (top > p * 0.9) status = 'warn';
            }
            break;
          case 'max_positions':
            if (v.max != null && positionCount > Number(v.max)) { status = 'bad'; detail = `${positionCount} positions exceed the ${v.max} max.`; }
            else detail = `${positionCount} of ${v.max ?? '—'} positions.`;
            break;
          case 'min_positions':
            if (v.min != null && positionCount < Number(v.min)) { status = 'bad'; detail = `${positionCount} positions below the ${v.min} minimum.`; }
            else detail = `${positionCount} positions (min ${v.min ?? '—'}).`;
            break;
          case 'prohibited_ticker':
            if (v.ticker && positions.some((x) => (x.ticker_symbol || '').toUpperCase() === String(v.ticker).toUpperCase())) {
              status = 'bad';
              detail = `Currently holding prohibited ${v.ticker}.`;
            } else detail = `${v.ticker || '—'} not held.`;
            break;
          case 'prohibited_sector':
            if (v.sector && positions.some((x) => x.sector === v.sector)) { status = 'bad'; detail = `Holding in prohibited ${v.sector}.`; }
            else detail = `No ${v.sector || '—'} exposure.`;
            break;
          default:
            detail = 'Enforced at trade time.';
        }
        return { rule_id: rule.id, rule_type: rule.rule_type, label: rule.label, status, detail };
      });
      return NextResponse.json({ mode: 'portfolio', ruleStatus, totalValue, positionCount });
    }

    const violations = [];
    const sev = (rule) => (rule.rule_value?.severity === 'block' ? 'block' : 'warning');

    for (const rule of rules || []) {
      const v = rule.rule_value || {};
      const pct = num(v.pct);
      let hit = null;

      switch (rule.rule_type) {
        case 'prohibited_ticker':
          if (v.ticker && ticker && String(v.ticker).toUpperCase() === ticker) {
            hit = `${ticker} is on the prohibited-securities list.`;
          }
          break;
        case 'prohibited_sector':
          if (v.sector && sector && v.sector === sector) {
            hit = `${sector} is a prohibited sector.`;
          }
          break;
        case 'max_position_pct':
          if (pct != null && sizePct != null && sizePct > pct) {
            hit = `Proposed ${sizePct}% exceeds the ${pct}% single-position limit.`;
          }
          break;
        case 'max_single_trade_pct':
          if (pct != null && sizePct != null && sizePct > pct) {
            hit = `Trade size ${sizePct}% exceeds the ${pct}% single-trade limit.`;
          }
          break;
        case 'max_sector_pct': {
          if (pct != null && sector && totalValue > 0) {
            const curPct = ((sectorValue[sector] || 0) / totalValue) * 100;
            const projected = curPct + (sizePct || 0);
            if (projected > pct) {
              hit = `${sector} would reach ${projected.toFixed(1)}%, over the ${pct}% sector cap.`;
            }
          }
          break;
        }
        case 'max_positions':
          if (v.max != null && !alreadyHeld && positionCount + 1 > Number(v.max)) {
            hit = `Adding ${ticker} would exceed the ${v.max}-position maximum.`;
          }
          break;
        case 'min_market_cap':
          if (v.value != null && marketCap != null && marketCap < Number(v.value)) {
            hit = `${ticker} market cap is below the minimum of ${v.value}.`;
          }
          break;
        default:
          // min_positions / cash_floor_pct evaluated by the compliance monitor,
          // not by an add-position check.
          break;
      }

      if (hit) {
        violations.push({
          rule_id: rule.id,
          rule_type: rule.rule_type,
          severity: sev(rule),
          detail: rule.label ? `${rule.label}: ${hit}` : hit,
        });
      }
    }

    const blocked = violations.some((x) => x.severity === 'block');

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
