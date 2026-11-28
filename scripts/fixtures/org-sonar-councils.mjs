/**
 * TEST FIXTURE ONLY. Two invented councils for scripts/check-org-sonar-intelligence.mjs.
 * Every name, ticker weight, pitch and report below is made up for tests; none of it is
 * production research and nothing here is ever seeded into a database.
 */

const ORG_A = '00000000-0000-4000-8000-00000000a001'; // "Fixture Ridge Student Fund"
const ORG_B = '00000000-0000-4000-8000-00000000b001'; // "Fixture Harbor Council"
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const FIXTURE = { ORG_A, ORG_B, label: 'TEST FIXTURE: invented councils, not production data' };

export const members = {
  analystA: { id: id(11), user_id: id(111), org_id: ORG_A, role: 'analyst', sub_role: 'Junior Analyst', team_id: id(501), is_active: true, display_name: 'Fixture Analyst One' },
  analystA2: { id: id(12), user_id: id(112), org_id: ORG_A, role: 'analyst', sub_role: 'Junior Analyst', team_id: id(502), is_active: true, display_name: 'Fixture Analyst Two' },
  pmA: { id: id(13), user_id: id(113), org_id: ORG_A, role: 'portfolio_manager', sub_role: 'Senior PM', team_id: id(501), is_active: true, display_name: 'Fixture PM' },
  execA: { id: id(14), user_id: id(114), org_id: ORG_A, role: 'executive', sub_role: 'President', team_id: null, is_active: true, display_name: 'Fixture President' },
  analystB: { id: id(21), user_id: id(111), org_id: ORG_B, role: 'analyst', sub_role: 'Junior Analyst', team_id: id(601), is_active: true, display_name: 'Fixture Analyst One (B)' },
};

const pos = (org, ticker, sector, shares, avg, price) => {
  const value = shares * (price ?? avg);
  return { org_id: org, ticker, ticker_symbol: ticker, name: `${ticker} Fixture Co`, sector, shares, avg_cost: avg, current_price: price, priced: price != null, value, current_value: value, cost: shares * avg, pl: value - shares * avg, last_priced_at: price != null ? '2026-11-27T21:00:00Z' : null };
};

/* Council A book: total 100,000. MSFT 30k, NVDA 25k, AAPL 15k, JPM 20k, XOM 10k (at cost). */
export const bookA = [
  pos(ORG_A, 'MSFT', 'Technology', 100, 250, 300),
  pos(ORG_A, 'NVDA', 'Technology', 100, 150, 250),
  pos(ORG_A, 'AAPL', 'Technology', 100, 120, 150),
  pos(ORG_A, 'JPM', 'Financials', 100, 180, 200),
  pos(ORG_A, 'XOM', 'Energy', 100, 100, null),
];
/* Council B holds MSFT too, with a different weight. */
export const bookB = [pos(ORG_B, 'MSFT', 'Technology', 10, 300, 300), pos(ORG_B, 'KO', 'Consumer Staples', 100, 60, 60)];

export const ipsA = [
  { id: id(901), org_id: ORG_A, rule_type: 'max_sector_pct', rule_value: { pct: 70, severity: 'warning' }, label: 'Sector cap', is_active: true },
  { id: id(902), org_id: ORG_A, rule_type: 'max_position_pct', rule_value: { pct: 32, severity: 'warning' }, label: 'Single position cap', is_active: true },
  { id: id(903), org_id: ORG_A, rule_type: 'prohibited_ticker', rule_value: { ticker: 'TSLA', severity: 'block' }, label: 'Prohibited list', is_active: true },
];

export const pitchesA = [
  {
    id: id(301), org_id: ORG_A, ticker: 'MSFT', company_name: 'MSFT Fixture Co', analyst_member_id: members.analystA.id, team_id: id(501), stage: 'deep_dive', ic_meeting_id: id(701), created_at: '2026-10-01T00:00:00Z',
    thesis_short: 'Cloud margin expansion and AI attach rates drive durable earnings growth over three years.',
    thesis_full: 'We expect revenue growth to stay above 12%. However, capex intensity is a risk to the thesis.',
    assumptions: ['Cloud revenue grows above 20% a year', 'Operating margin stays above 40%'],
    risks: ['Capex overruns compress free cash flow', 'Antitrust action in cloud bundling'],
    catalysts: ['Next fiscal year guidance'],
    target_price: 420,
    valuation_method: null,
    bull_case: 'AI attach lifts growth to 18%.',
    bear_case: null,
  },
];

export const meetingsA = [
  { id: id(700), org_id: ORG_A, title: 'Fixture IC, October', scheduled_at: '2026-10-15T18:00:00Z', agenda: 'Portfolio review' },
  { id: id(701), org_id: ORG_A, title: 'Fixture IC, December', scheduled_at: '2026-12-03T18:00:00Z', agenda: 'MSFT pitch\nSector cap review' },
];

export const reportsA = [
  { id: id(401), org_id: ORG_A, author_id: members.analystA.user_id, team_id: id(501), title: 'MSFT deep dive', ticker: 'MSFT', visibility: 'private', status: 'draft', shared_with: [], updated_at: '2026-11-20T00:00:00Z', created_at: '2026-11-01T00:00:00Z' },
  { id: id(402), org_id: ORG_A, author_id: members.analystA2.user_id, team_id: id(502), title: 'NVDA thesis', ticker: 'NVDA', visibility: 'executives', status: 'approved', approved_version: 1, current_version: 1, approved_at: '2026-04-10T00:00:00Z', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-04-10T00:00:00Z' },
  { id: id(403), org_id: ORG_A, author_id: members.pmA.user_id, team_id: id(501), title: 'JPM update', ticker: 'JPM', visibility: 'org', status: 'approved', approved_version: 2, current_version: 2, approved_at: '2026-11-10T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-11-10T00:00:00Z' },
  { id: id(404), org_id: ORG_A, author_id: members.analystA.user_id, team_id: id(501), title: 'AAPL note', ticker: 'AAPL', visibility: 'team', status: 'under_review', updated_at: '2026-11-25T00:00:00Z', created_at: '2026-11-25T00:00:00Z' },
];

export const coverageA = [{ member_id: members.analystA2.id, sector: 'Financials', is_primary: true }];

export const flagsA = [{ id: id(801), ticker: 'NVDA', subject: 'Valuation stretched', flag_color: 'amber', status: 'open', created_at: '2026-11-20T00:00:00Z' }];

export const NOW = Date.parse('2026-11-28T12:00:00Z');
