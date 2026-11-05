/**
 * Sonar for organizations: the fund context a fund fit run reads (server).
 *
 * Read with the service client after the research route has resolved the
 * caller's org membership: the fund's mandate (org_fund_config), its
 * active IPS rules (org_ips_rules) and its current holdings with weights
 * (org_positions, market value from the stored price). Never cross-org.
 */
export async function loadFundContext(admin, orgId) {
  if (!admin || !orgId) return null;
  const [cfg, org, rules, positions] = await Promise.all([
    admin.from('org_fund_config').select('*').eq('org_id', orgId).maybeSingle(),
    admin
      .from('organizations')
      .select('name, university_name, fund_display_name')
      .eq('id', orgId)
      .maybeSingle(),
    admin
      .from('org_ips_rules')
      .select('rule_type, rule_value, label')
      .eq('org_id', orgId)
      .eq('is_active', true),
    admin
      .from('org_positions')
      .select('ticker, sector, shares, current_price, avg_cost')
      .eq('org_id', orgId)
      .limit(500),
  ]);
  const c = cfg.data || {};
  const rows = (positions.data || []).filter((p) => p.ticker && Number(p.shares) > 0);
  const value = (p) => Number(p.shares) * Number(p.current_price || p.avg_cost || 0);
  const total = rows.reduce((s, p) => s + (Number.isFinite(value(p)) ? value(p) : 0), 0);
  return {
    orgId,
    name: org.data?.university_name || org.data?.name || null,
    fundName: c.fund_display_name || org.data?.fund_display_name || org.data?.name || 'The fund',
    benchmark: c.benchmark_symbol || null,
    thesis: c.investment_thesis || null,
    universe: c.mandate_universe || null,
    horizon: c.mandate_horizon || null,
    style: c.investment_style || null,
    focusSectors: Array.isArray(c.focus_sectors) ? c.focus_sectors : [],
    excludedSectors: Array.isArray(c.excluded_sectors) ? c.excluded_sectors : [],
    minMarketCapMusd: c.min_market_cap_musd != null ? Number(c.min_market_cap_musd) : null,
    ips: (rules.data || []).map((r) => ({
      type: r.rule_type,
      value: r.rule_value || {},
      label: r.label,
    })),
    holdings: rows.map((p) => ({
      ticker: String(p.ticker).toUpperCase(),
      sector: p.sector || null,
      weightPct: total > 0 && Number.isFinite(value(p)) ? (value(p) / total) * 100 : null,
    })),
  };
}
