/**
 * A standard research run for "Which countries produce the most crude oil?", shaped like the
 * live stream state (Nov 7 2026 run, figures as stored). Used by
 * check-sonar-research-board.mjs and the visual harness.
 */
const EIA = 'U.S. Energy Information Administration, International Energy Data (public domain)';
const rows = [
  ['United States', 13791.94],
  ['Russia', 9582],
  ['Saudi Arabia', 7290],
  ['Canada', 4951.66],
  ['Brazil', 4474.81],
  ['China', 4420.89],
  ['United Arab Emirates', 4170],
  ['Iran', 3150],
  ['Kazakhstan', 2147.1],
  ['Iraq', 1945],
].map(([label, value]) => ({ label, value, note: '2026-06' }));

const wti = [];
{
  let v = 76.1;
  const start = Date.UTC(2023, 10, 8);
  for (let i = 0; i < 760; i++) {
    const d = new Date(start + i * 1.44 * 864e5);
    v += Math.sin(i / 23) * 0.6 + (i > 560 ? 0.11 : -0.012) + Math.cos(i / 7) * 0.4;
    wti.push({
      x: d.toISOString().slice(0, 10),
      y: +Math.max(55.44, Math.min(114.58, v)).toFixed(2),
    });
  }
  wti[0].y = 76.6;
  wti[wti.length - 1] = { x: '2026-11-07', y: 100.63 };
}

export const oilState = {
  status: 'done',
  plan: {
    runId: 'run_oil',
    spec: {
      question: 'Which countries produce the most crude oil?',
      domains: [{ id: 'commodity' }],
      depth: 'standard',
      timeHorizon: { kind: 'unspecified' },
    },
    universe: { label: 'Energy Companies', count: 0, basis: "Ezana's energy company universe" },
  },
  analysis: {
    metrics: [
      {
        id: 'commodity_change_period',
        unit: 'percent',
        label: 'Crude oil (WTI) change over the period shown',
        value: 31.3645,
        method: '(last close - first close) / first close x 100',
        period: { from: '2023-11-08', to: '2026-11-07', label: '2023-11-08 to 2026-11-07' },
      },
      ...rows.slice(0, 5).map((r, i) => ({
        id: `macro_rank_oil_production_${i}`,
        unit: 'rank',
        label: `${r.label}: rank on Highest crude oil production`,
        value: i + 1,
        method: `rank among the countries listed by each country's latest observation (highest first), one source for all: ${EIA}`,
        period: { label: 'latest observation per country, most recent 2026-06' },
      })),
    ],
    visualizations: [
      {
        id: 'commodity_price',
        type: 'line',
        title: 'Crude oil (WTI) price',
        unit: 'USD per barrel',
        source: 'Market price data',
        method: 'daily closing price',
        period: { from: '2023-11-08', to: '2026-11-07' },
        series: wti,
      },
      {
        id: 'macro_rank_oil_production',
        type: 'bars',
        title: 'Highest crude oil production',
        unit: 'thousand barrels per day',
        source: EIA,
        method: "each country's latest observation; periods differ by country as noted",
        period: { label: 'latest data: Jun 2026 for 215 countries' },
        rows,
        evidenceIds: ['ev_rank'],
      },
    ],
  },
  report: {
    format: 'research',
    executiveConclusion: null,
    keyFindings: [
      {
        id: 'finding_6',
        title: 'WTI crude oil prices have risen 31.4% over three years',
        classification: 'verified_fact',
        markers: ['S2'],
        period: '2023-11-08 to 2026-11-07',
        metrics: ['commodity_change_period'],
        entities: ['WTI'],
        explanation:
          'Crude oil (WTI) front-month prices increased 31.4% from November 8, 2023 to November 7, 2026, with prices ranging from 55.44 to 114.58 over that period. Over the last 12 months alone, prices rose 68.0%, suggesting recent acceleration in oil valuations.',
        validation: { action: 'kept', problems: [] },
      },
    ],
    analysis: [
      {
        id: 'analysis_2',
        classification: 'analytical_interpretation',
        markers: ['S2', 'S3'],
        text: 'Recent crude oil price strength may reflect supply-side concerns following geopolitical events. A March 2026 editorial noted that supply disruptions through the Strait of Hormuz beginning February 28, 2026 repriced commodity markets, with oil gaining 40-55% since that date, and WTI prices have risen 68% in the 12 months ending November 7, 2026.',
      },
    ],
  },
  run: {
    runId: 'run_oil',
    confidence: 'high',
    limitations: [
      'The data provided ranks only the top ten crude oil producers; the full ranking of all 215 countries tracked by the U.S. Energy Information Administration is not supplied.',
      'The question does not specify whether ranking should be by volume, value, reserve size, or production growth rate; only current volume rankings are provided.',
      'WTI price data does not directly measure production costs, profitability, or export volumes by country, which would provide additional context on producer leverage.',
    ],
    evidence: [
      {
        id: 'ev_rank',
        marker: 'S1',
        category: 'historical',
        source: 'macro_series',
        title: 'Highest crude oil production',
        text: `Highest crude oil production (thousand barrels per day), Jun 2026 unless noted: 1. United States 13,792; 2. Russia 9,582; 3. Saudi Arabia 7,290; 4. Canada 4,952; 5. Brazil 4,475. Each country's latest observation (latest data: Jun 2026 for 215 countries). Source: ${EIA}.`,
        period: { label: '2026-06' },
        retrievedAt: '2026-11-07T00:04:00Z',
        why: ['entityMatch', 'relevance', 'reliability'],
      },
      {
        id: 'ev_wti',
        marker: 'S2',
        category: 'market_data',
        source: 'commodity_series',
        title: 'Crude oil (WTI) price history',
        text: 'Crude oil (WTI) (front-month proxy) closed at 100.63 on 2026-11-07. Change since 2023-11-08: +31.4%. Last 12 months: +68.0%, range 55.44 to 114.58.',
        period: { label: '2023-11-08 to 2026-11-07' },
        retrievedAt: '2026-11-07T00:04:00Z',
        why: ['entityMatch'],
      },
      {
        id: 'ev_echo',
        marker: 'S3',
        category: 'supporting_research',
        source: 'echo',
        title: 'Best-Performing Commodities Since the Iran War',
        text: 'Since the Iran war began on February 28, 2026, supply disruptions through the Strait of Hormuz have repriced commodities markets globally.',
        date: '2026-04-26',
        retrievedAt: '2026-11-07T00:04:00Z',
        why: ['entityMatch'],
      },
      {
        id: 'ev_rank2',
        marker: 'S4',
        category: 'historical',
        source: 'macro_series',
        title: 'Highest crude oil production, ranks 6 to 10',
        text: 'Continued: 6. China 4,421; 7. United Arab Emirates 4,170; 8. Iran 3,150; 9. Kazakhstan 2,147; 10. Iraq 1,945.',
        retrievedAt: '2026-11-07T00:04:00Z',
        why: ['relevance'],
      },
    ],
    methodology: {
      plan: {
        tasks: [
          { source: 'commodity_series' },
          { source: 'macro_series' },
          { source: 'news' },
          { source: 'echo' },
        ],
        excluded: [],
      },
      evidence: { retrieved: 4, selected: 4 },
    },
    team: {
      mode: 'standard',
      lead: { id: 'energy', title: 'Senior Energy and Commodities Analyst' },
      supporting: [{ id: 'agri', title: 'Senior Agriculture, Food and Climate Risk Analyst' }],
      specialists: [
        {
          id: 'energy',
          title: 'Senior Energy and Commodities Analyst',
          role: 'lead',
          status: 'done',
          conclusion: 'Production is concentrated in a handful of countries.',
        },
        {
          id: 'agri',
          title: 'Senior Agriculture, Food and Climate Risk Analyst',
          role: 'supporting',
          status: 'missing',
        },
      ],
      audit: { passed: 10, total: 11, checks: [] },
      methodology: null,
    },
  },
};
