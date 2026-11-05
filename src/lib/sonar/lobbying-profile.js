/**
 * A company's federal lobbying, rolled up for the strategic positioning
 * assessment (Nov 2026): spend by year and quarter, the outside firms it
 * retains, the LDA issue areas its reports name, and how those areas line up
 * with the policy questions that shape AI infrastructure economics.
 *
 * Counting rules (the same as sonar_lobbying_by_tickers, applied per company):
 *   - quarterly reports only; registrations carry no spend
 *   - an amended report replaces the original for the same registrant and
 *     quarter (the newest posting wins)
 *   - a company that files its own reports includes its outside firms' fees
 *     in its total, so when it self-files only its own reports are summed;
 *     the outside firms are still listed, with what they reported
 *
 * An LDA issue code says a report touched an area. It is not a position, a
 * bill or an outcome, and the text never says otherwise.
 *
 * Pure. Unit-tested in scripts/check-sonar-positioning.mjs.
 */

const norm = (s) =>
  String(s || '')
    .toUpperCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Policy areas that bear on AI infrastructure, by LDA issue code and text. */
export const POLICY_AREAS = [
  {
    id: 'ai_technology',
    label: 'AI, technology and data',
    codes: [
      'Computer Industry',
      'Science/Technology',
      'Telecommunications',
      'Consumer Issues/Safety/Products',
      'Copyright/Patent/Trademark',
    ],
    text: /\b(artificial intelligence|\bAI\b|machine learning|data privacy|cyber\w*)\b/i,
    why: 'AI rules, data and security requirements, and intellectual property',
  },
  {
    id: 'energy_power',
    label: 'Energy, power and permitting',
    codes: [
      'Energy/Nuclear',
      'Utilities',
      'Environment/Superfund',
      'Clean Air & Water (Quality)',
      'Fuel/Gas/Oil',
      'Real Estate/Land Use/Conservation',
    ],
    text: /\b(data cent(?:er|re)s?|electric\w*|power grid|transmission|permitting|energy|nuclear)\b/i,
    why: 'Power access, grid connection and construction timelines for data centers',
  },
  {
    id: 'procurement',
    label: 'Government procurement and security',
    codes: [
      'Defense',
      'Government Issues',
      'Homeland Security',
      'Budget/Appropriations',
      'Intelligence and Surveillance',
    ],
    text: /\b(procurement|fedramp|cloud security|national security|defense)\b/i,
    why: 'Eligibility for and funding of government cloud and AI work',
  },
  {
    id: 'trade_export',
    label: 'Trade and export controls',
    codes: ['Trade (domestic/foreign)', 'Foreign Relations', 'Tariff (Miscellaneous Tariff Bills)'],
    text: /\b(export controls?|tariffs?|trade)\b/i,
    why: 'Accelerator supply and access to international markets',
  },
  {
    id: 'tax',
    label: 'Tax',
    codes: ['Taxation/Internal Revenue Code'],
    text: /\b(tax\w*)\b/i,
    why: 'Tax treatment of capital investment and research',
  },
  {
    id: 'competition_workforce',
    label: 'Competition, workforce and immigration',
    codes: ['Labor Issues/Antitrust/Workplace', 'Immigration', 'Education'],
    text: /\b(antitrust|competition|immigration|visa|workforce)\b/i,
    why: 'Antitrust scrutiny and access to skilled labor',
  },
];

const issueNames = (r) =>
  (Array.isArray(r?.issues) ? r.issues : [])
    .map((i) => (typeof i === 'string' ? i : i?.display || i?.name || ''))
    .filter(Boolean);

/**
 * Roll up one company's filings.
 * @param {Array} rows lobbying_filings rows for the company's client names
 * @param {{ from: number, to: number }} years
 */
export function rollupLobbying(rows, { from, to } = {}) {
  const inRange = (rows || []).filter(
    (r) =>
      !r.is_registration &&
      (!from || Number(r.filing_year) >= from) &&
      (!to || Number(r.filing_year) <= to),
  );
  /* An amendment replaces the original: newest posting per registrant and quarter. */
  const latest = new Map();
  for (const r of inRange) {
    const k = `${norm(r.registrant_name)}|${r.filing_year}|${String(r.quarter || r.filing_period || '').toLowerCase()}`;
    const cur = latest.get(k);
    if (!cur || String(r.dt_posted || '') > String(cur.dt_posted || '')) latest.set(k, r);
  }
  const reports = [...latest.values()].map((r) => ({
    ...r,
    self: norm(r.registrant_name) === norm(r.client_name),
    amount: Number(r.amount) || 0,
  }));
  if (!reports.length) return null;
  const selfFiled = reports.some((r) => r.self);
  const counted = reports.filter((r) => (selfFiled ? r.self : true));

  const byYear = {};
  const byQuarter = {};
  for (const r of counted) {
    byYear[r.filing_year] = (byYear[r.filing_year] || 0) + r.amount;
    const q = `${r.filing_year} ${String(r.quarter || '').toUpperCase()}`.trim();
    byQuarter[q] = (byQuarter[q] || 0) + r.amount;
  }
  const firms = new Map();
  for (const r of reports.filter((x) => !x.self)) {
    const f = firms.get(r.registrant_name) || { firm: r.registrant_name, amount: 0, reports: 0 };
    f.amount += r.amount;
    f.reports += 1;
    firms.set(r.registrant_name, f);
  }
  const issueCount = new Map();
  for (const r of reports)
    for (const i of issueNames(r)) issueCount.set(i, (issueCount.get(i) || 0) + 1);

  const areas = POLICY_AREAS.map((a) => {
    const hits = reports.filter(
      (r) =>
        issueNames(r).some((i) => a.codes.includes(i)) ||
        (r.specific_issues && a.text.test(String(r.specific_issues))),
    );
    const text = reports.filter((r) => r.specific_issues && a.text.test(String(r.specific_issues)));
    const sample = text[0]?.specific_issues
      ? String(text[0].specific_issues).replace(/\s+/g, ' ').trim().slice(0, 220)
      : null;
    return {
      id: a.id,
      label: a.label,
      why: a.why,
      reports: hits.length,
      share: reports.length ? hits.length / reports.length : 0,
      textMatches: text.length,
      latest:
        hits
          .map((r) => `${r.filing_year} ${String(r.quarter || '').toUpperCase()}`.trim())
          .sort()
          .pop() || null,
      sample,
    };
  }).filter((a) => a.reports > 0);

  const years = Object.keys(byYear).map(Number).sort();
  return {
    selfFiled,
    total: counted.reduce((s, r) => s + r.amount, 0),
    reports: counted.length,
    allReports: reports.length,
    byYear: years.map((y) => ({ year: y, amount: byYear[y] })),
    byQuarter: Object.entries(byQuarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, amount]) => ({ quarter, amount })),
    firms: [...firms.values()].sort((a, b) => b.amount - a.amount).slice(0, 8),
    issues: [...issueCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([issue, n]) => ({ issue, reports: n })),
    areas,
    firstYear: years[0] ?? null,
    lastYear: years[years.length - 1] ?? null,
  };
}
