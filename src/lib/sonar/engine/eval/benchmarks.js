/**
 * Sonar research benchmarks (Section 13). Versioned: change a benchmark,
 * bump BENCHMARK_VERSION, and old scores stop being compared with new ones.
 *
 * Each benchmark states what a good research run must do, in terms the
 * scorer can check from the run itself:
 *   domains        domains the spec must activate (top 6)
 *   subject        the expected primary subject (kind and id), when one
 *   mustRun        sources the plan must include
 *   mustNotRun     sources the plan must exclude (irrelevant datasets)
 *   visualizations charts that should render when the data exists
 *   limitation     a pattern the limitations or findings must state
 *   forbidden      patterns no surviving claim may contain
 * "Analytical quality" is not checkable this way; the scorer's optional
 * judge hook covers it and is reported separately, never blended silently.
 */

export const BENCHMARK_VERSION = 'bench-v1';

export const BENCHMARKS = [
  {
    id: 'ai_lobbying',
    mandatory: true,
    query: 'Who is lobbying hardest on AI regulation?',
    domains: ['lobbying'],
    mustRun: ['lobbying_leaders'],
    mustNotRun: ['macro_country', 'commodity_series', 'congress_sector'],
    visualizations: ['lobbying_leaders'],
    limitation:
      /\b(ai[- ]specific|issue (?:area|code)s?|not (?:split|separate|broken out)|does not (?:split|separate|break))\b/i,
    forbidden: [CONDUCT()],
  },
  {
    id: 'china_taiwan_exposure',
    mandatory: true,
    query:
      'Which publicly traded companies are most exposed to escalating tensions between China and Taiwan?',
    domains: ['geopolitics'],
    mustRun: ['revenue_geo', 'news'],
    mustNotRun: ['lobbying_leaders', 'commodity_series'],
    visualizations: ['revenue_exposure'],
    limitation: /\b(segment|billing|end demand|supply[- ]chain dependence|estimate)\b/i,
    forbidden: [CONDUCT()],
  },
  {
    id: 'congress_semis',
    mandatory: true,
    query:
      'Which members of Congress have made the most significant investments in semiconductor companies?',
    domains: ['congress_trading', 'industry'],
    mustRun: ['congress_sector'],
    mustNotRun: ['commodity_series', 'macro_country'],
    visualizations: ['congress_most_traded'],
    limitation: /\b(range|ranges|not exact|transactions?,? not (?:current )?holdings|holdings)\b/i,
    forbidden: [CONDUCT()],
  },
  {
    id: 'copper_outlook',
    mandatory: true,
    query: 'What factors are most likely to influence copper prices over the next 12 months?',
    domains: ['commodity'],
    subject: { kind: 'commodity', id: 'copper' },
    mustRun: ['commodity_series', 'news'],
    mustNotRun: ['lobbying_leaders', 'congress_sector'],
    visualizations: ['commodity_price'],
    limitation: /\b(forecast|uncertain\w*|scenario|inventor(?:y|ies)|production)\b/i,
    forbidden: [/\bwill (?:rise|fall|reach|hit)\b/i],
  },
  {
    id: 'nvidia_ai_capex',
    mandatory: true,
    query: 'How financially exposed is Nvidia to changes in AI infrastructure spending?',
    domains: ['company', 'company_financials'],
    subject: { kind: 'company', id: 'NVDA' },
    mustRun: ['market_snapshot', 'revenue_geo'],
    mustNotRun: ['lobbying_leaders', 'commodity_series'],
    visualizations: ['revenue_exposure'],
    limitation:
      /\b(estimate|segment|disclos\w*|customer concentration|not (?:disclosed|reported))\b/i,
    forbidden: [/\b(buy|sell|hold) (?:rating|recommendation) from ezana\b/i],
  },
  /* Regressions from production. */
  {
    id: 'defense_congress',
    query: 'Which defense stocks are members of Congress trading?',
    domains: ['congress_trading'],
    mustRun: ['congress_sector'],
    mustNotRun: ['market_snapshot'],
    notSubject: { kind: 'company', id: 'ARE' },
  },
  {
    id: 'pelosi_buying',
    query: 'What has Nancy Pelosi been buying lately?',
    domains: ['politician'],
    subject: { kind: 'politician', id: 'P000197' },
    mustRun: ['politician_dossier'],
    forbidden: [/\bretired\b/i],
  },
  {
    id: 'nvidia_export_controls',
    query: 'How exposed is Nvidia to China export controls?',
    domains: ['company', 'geopolitics'],
    subject: { kind: 'company', id: 'NVDA' },
    mustRun: ['revenue_geo', 'sanctions'],
  },
  {
    id: 'lockheed_contracts',
    query: 'Lockheed Martin government contracts',
    domains: ['company', 'contracts'],
    subject: { kind: 'company', id: 'LMT' },
    mustRun: ['contracts_history'],
  },
  {
    id: 'brazil_outlook',
    query: 'Brazilian economy outlook for the next 2 years',
    domains: ['country'],
    mustRun: ['macro_country'],
    mustNotRun: ['lobbying_leaders', 'congress_sector'],
  },
  /* Nov 2026, deep research: the flagship analyst question. Run at deep
     depth it is an investment risk assessment (investment-memo.js). */
  {
    id: 'nvidia_three_year_risks',
    mandatory: true,
    depth: 'deep',
    query:
      "What are the biggest risks to NVIDIA's growth over the next three years? Analyze its financial performance, institutional ownership, government contracts, industry exposure, and competitive landscape.",
    domains: ['company', 'company_financials', 'competition', 'institutional', 'contracts'],
    subject: { kind: 'company', id: 'NVDA' },
    mustRun: [
      'company_financials',
      'product_segments',
      'holder_positioning',
      'peer_financials',
      'contracts_history',
      'analysts',
      'news',
    ],
    mustNotRun: ['macro_country', 'commodity_series', 'congress_sector', 'lobbying_leaders'],
    limitation: /\b(customer concentration|13f|delayed|ceiling|not (?:split|separate))\b/i,
    forbidden: [CONDUCT(), /\b(price target of|we (?:rate|recommend)|buy rating from ezana)\b/i],
  },
];

function CONDUCT() {
  return /\b(insider (?:knowledge|information|trading)|conflicts? of interest|illegal|corrupt\w*|wrongdoing)\b/i;
}
