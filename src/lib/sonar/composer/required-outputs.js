/**
 * Sonar 6.2 (Nov 28 2026): research operation contracts.
 *
 * For each analytical capability: the calculations, tables and disclosures a completed
 * result must contain, checked against the result itself (never against the fact that the
 * step returned). The fulfillment contract (fulfillment.js) marks an analysis 'limited'
 * when a requirement is unmet, the confidence audit reads the same checks, and the writer
 * is told what its conclusion must state.
 *
 * requiredOutputs(result) -> [{ id, label, ok, detail }]
 * conclusionRule(result)  -> one instruction for the writer, or null
 *
 * Pure.
 */

const has = (x) => x != null && !(Array.isArray(x) && !x.length);

const CONTRACTS = {
  'institutional-ownership': (r) => {
    const o = r.ownership || {};
    const rows = o.rows || [];
    return [
      {
        id: 'universe',
        label: 'Eligible holdings established',
        ok: has(o.universe) || rows.length > 0,
      },
      { id: 'period', label: '13F reporting quarter identified', ok: has(o.period) },
      {
        id: 'ranking',
        label: 'Ranked by the requested metric',
        ok: rows.some((x) => x.rank != null),
      },
      { id: 'coverage', label: 'Filer coverage disclosed', ok: has(o.coverage?.filers) },
    ];
  },
  'fundamental-analysis': (r) => [
    {
      id: 'companies',
      label: 'Companies with filed financials',
      ok: (r.coverage?.withData || 0) > 0,
    },
    {
      id: 'metrics',
      label: 'Requested metrics computed',
      /* Older results carry no `complete` count: any computed ratio counts. */
      ok:
        r.coverage?.complete != null
          ? r.coverage.complete > 0
          : (r.table || []).some(
              (t) => t.ratios && Object.values(t.ratios).some((v) => Number.isFinite(v)),
            ),
    },
  ],
  'financial-screen': (r) => {
    const f = r.funnel || [];
    return [
      {
        id: 'universe',
        label: 'Universe resolved',
        ok: (f[0]?.count || 0) > 0,
        detail: f[0]?.label || null,
      },
      {
        id: 'filters',
        label: 'Every filter applied with its count',
        ok: f.filter((x) => x.step.startsWith('filter:')).every((x) => Number.isFinite(x.count)),
      },
      {
        id: 'ranking',
        label: r.rankBy ? 'Ranked by the requested measure' : 'Result listed',
        ok: Array.isArray(r.table),
        detail: `${(r.table || []).length} shown`,
      },
      { id: 'coverage', label: 'Companies without the data counted', ok: f.length >= 2 },
    ];
  },
  'company-comparison': (r) => [
    {
      id: 'companies',
      label: 'At least two companies with filed figures',
      ok: (r.coverage?.withData || 0) >= 2,
    },
    {
      id: 'leaders',
      label: 'Leader identified per metric',
      ok: Object.keys(r.leaders || {}).length > 0,
    },
    { id: 'alignment', label: 'Fiscal-year alignment checked', ok: typeof r.aligned === 'boolean' },
  ],
  'macro-indicators': (r) => {
    const m = r.macro || {};
    const xs = Object.values(m.byCountry || {});
    const want = new Set(m.measures || []);
    return [
      { id: 'countries', label: 'Every named country with data', ok: xs.length > 0 },
      ...(want.has('inflation')
        ? [
            {
              id: 'inflation',
              label: 'Year-on-year inflation with its month',
              ok: xs.every((x) => x.latestYoY != null),
            },
          ]
        : []),
      ...(want.has('real_rate')
        ? [
            {
              id: 'real_rate',
              label: 'Real policy rate for a paired month',
              ok: xs.every((x) => x.realRate != null),
            },
          ]
        : []),
      ...(want.has('policy_changes')
        ? [
            {
              id: 'changes',
              label: 'Policy changes in the window, dated',
              ok: xs.every((x) => x.changesThisYear != null),
            },
          ]
        : []),
    ];
  },
  'government-dependence': (r) => {
    const d = r.dependence || {};
    return [
      {
        id: 'obligations',
        label: 'Federal award value by start year',
        ok: (d.years || []).length > 0,
      },
      { id: 'agencies', label: 'Awarding agencies ranked', ok: (d.topAgencies || []).length > 0 },
      { id: 'revenue', label: 'Filed revenue denominator', ok: has(d.revenue) },
      {
        id: 'ratio',
        label: 'Award-value-to-revenue indicator, periods paired',
        ok: has(d.obligationsToRevenue) && d.pairedFiscalYear != null,
      },
    ];
  },
  'dcf-valuation': (r) => [
    { id: 'valued', label: 'At least one company valued', ok: (r.table || []).some((t) => t.ok) },
  ],
};

export function requiredOutputs(result) {
  const fn = CONTRACTS[result?.capability];
  if (!fn || result.status !== 'done') return [];
  return fn(result);
}

/** What the writer's conclusion must state for this result (null when nothing specific). */
export function conclusionRule(result) {
  if (result?.status !== 'done') return null;
  switch (result.capability) {
    case 'financial-screen':
      return '- The executive conclusion must name the top companies of the screen with the ranking measure’s values, state the universe and how many companies passed each filter, and say which companies lacked the data. Do not add companies the screen did not return.';
    case 'company-comparison':
      return '- The executive conclusion must compare the named companies metric by metric using the computed figures, name the leader on each, and say when fiscal years do not line up.';
    case 'macro-indicators':
      return '- The executive conclusion must give, for each country, year-on-year inflation with its month, the 3-month annualised rate and the trend as computed (accelerating, decelerating or mixed), the policy rate with its date and the real policy rate with its paired month, and any policy changes with their dates. Use only the computed figures; do not describe inflation expectations or forecasts as if computed.';
    case 'government-dependence': {
      const d = result.dependence || {};
      const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : 'N/A');
      return [
        '- The executive conclusion must state the value of federal prime awards that started in the latest fiscal year (obligated to date), its change, the top awarding agencies and the award-value-to-revenue indicator with both periods named, and say plainly that this is neither obligations made in the year nor recognized government revenue.',
        d.pairedFiscalYear != null
          ? `- The only award-value-to-revenue figure is ${pct(d.obligationsToRevenue)} (FY${d.pairedFiscalYear} awards against revenue for the fiscal year ending ${d.fiscalYearEnd}). Do not compute or state any other award-to-revenue ratio, and do not reuse a growth rate as a ratio.`
          : null,
        Number.isFinite(d.recognizedGovernmentShare)
          ? `- Recognized government revenue share: ${pct(d.recognizedGovernmentShare)} (${d.recognizedLabel || 'Government'} segment, fiscal year ending ${d.fiscalYearEnd}). Report it beside the award indicator; never combine them.`
          : '- No recognized government revenue share is available in this research. Say it is not available here; do not say or imply that the company does not disclose it.',
      ]
        .filter(Boolean)
        .join('\n');
    }
    default:
      return null;
  }
}
