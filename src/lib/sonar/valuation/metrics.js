/**
 * The valuation model's results as computed metrics (Nov 28 2026). The deep valuation
 * model (DCF, scenarios, sensitivity) was shown to the reader as a panel but never given to
 * the specialists or the writer, so a deep "Run a DCF" answer said no DCF could be run while
 * the panel beside it showed one. As metrics the figures are citable (M:id) and pass the
 * same number checks as every other calculation. Pure.
 */
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const r4 = (v) => (Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);

export function valuationMetrics(valuation) {
  if (!valuation || typeof valuation !== 'object') return [];
  const out = [];
  const period = valuation.asOf ? { label: `as of ${valuation.asOf}` } : null;
  const method = `Ezana valuation model (${valuation.version || 'valuation-model'})`;
  const add = (id, label, value, unit, how) => {
    if (value == null || !Number.isFinite(value)) return;
    out.push({
      id,
      label,
      value,
      unit,
      method: `${method}: ${how}`,
      inputs: ['valuation_model'],
      period,
      classification: 'calculated_result',
    });
  };
  const dcf = valuation.dcf?.ok ? valuation.dcf : null;
  const res = dcf?.result && !dcf.result.error ? dcf.result : null;
  const inp = dcf?.inputs || null;
  if (res) {
    add(
      'dcf_value_per_share',
      'DCF value per share (base case)',
      r2(res.perShare),
      'USD',
      'five-year FCFF discounted at WACC plus a Gordon terminal value, less net debt, per diluted share',
    );
    add(
      'dcf_wacc',
      'DCF discount rate (WACC)',
      r4(res.wacc),
      'ratio',
      'CAPM cost of equity (risk-free + beta x equity risk premium) and after-tax cost of debt, market-value weights',
    );
    add(
      'dcf_terminal_growth',
      'DCF terminal growth',
      r4(res.terminalGrowth ?? inp?.terminalGrowth),
      'ratio',
      'long-run growth after year five',
    );
    add(
      'dcf_terminal_share',
      'Terminal value share of enterprise value',
      r4(res.terminalShare),
      'ratio',
      'present value of the terminal value / enterprise value',
    );
  }
  if (inp) {
    add(
      'dcf_capex_pct_assumed',
      'DCF capex as a share of revenue (assumed)',
      r4(inp.capexPct),
      'ratio',
      'latest reported capex / revenue, held through the forecast',
    );
    add(
      'dcf_margin_assumed',
      'DCF operating margin (assumed)',
      r4(inp.margin),
      'ratio',
      'latest reported operating margin',
    );
    add(
      'dcf_start_growth',
      'DCF first-year revenue growth (assumed)',
      r4(inp.startGrowth),
      'ratio',
      `${inp.growthSource || 'model'} growth, fading to terminal`,
    );
    add('dcf_beta', 'Beta used in the DCF', r2(inp.beta), 'number', 'market beta');
    add(
      'dcf_risk_free',
      'Risk-free rate used in the DCF',
      r4(inp.riskFree),
      'ratio',
      '10-year Treasury yield',
    );
  }
  if (inp?.price > 0 && res?.perShare != null)
    add(
      'dcf_vs_price',
      'DCF base value versus price',
      r4(res.perShare / inp.price - 1),
      'ratio',
      'base value per share / price - 1',
    );
  for (const s of valuation.scenarios || []) {
    if (s?.error || s?.perShare == null) continue;
    const id = String(s.id || '').replace(/\W/g, '');
    if (id)
      add(
        `dcf_${id}_per_share`,
        `DCF value per share, ${s.label || id} case`,
        r2(s.perShare),
        'USD',
        `scenario: WACC ${s.assumptions?.waccPct}%, margin ${s.assumptions?.marginPct}%, first-year growth ${s.assumptions?.startGrowthPct}%`,
      );
  }
  const cells = (valuation.sensitivity?.waccGrowth?.cells || [])
    .flat()
    .filter((v) => Number.isFinite(v));
  if (cells.length) {
    add(
      'dcf_sensitivity_low',
      'DCF value per share, lowest in the WACC x terminal growth grid',
      r2(Math.min(...cells)),
      'USD',
      'sensitivity grid',
    );
    add(
      'dcf_sensitivity_high',
      'DCF value per share, highest in the WACC x terminal growth grid',
      r2(Math.max(...cells)),
      'USD',
      'sensitivity grid',
    );
  }
  return out;
}
