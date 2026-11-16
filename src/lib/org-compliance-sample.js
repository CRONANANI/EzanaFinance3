/**
 * Sample content for Compliance (/org-team-hub/compliance).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/ips/sample, so the page can be reviewed and presented from a
 * council with little activity. Real councils never receive it, and the page
 * labels it "Sample content" while it shows. Nothing here is read from or
 * written to the database: while it shows, adding, disabling or deleting a
 * rule, resolving a breach or running the idea check stays on the page.
 *
 * It is the same sample council every rebuilt Team Hub page shows: the
 * holdings are the Trading Desk sample's twelve positions (the same fund the
 * Command Center shows), filed under the four sector teams, the sector cap is
 * the 35% Fund Analytics uses, and there are 2 open breaches, as the Command
 * Center sample counts. Readings are worked out by the real rule engine from
 * these rows, never typed in. People are invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;

/* [type, stored value, severity, active, label] */
const RULES = [
  ['max_position_pct', { pct: 25 }, 'warning', true, 'Max single position 25%'],
  ['max_sector_pct', { pct: 35 }, 'block', true, 'Max sector exposure 35%'],
  ['max_single_trade_pct', { pct: 8 }, 'warning', true, 'Max single trade 8%'],
  ['max_positions', { max: 20 }, 'warning', true, 'Max positions 20'],
  ['min_positions', { min: 8 }, 'warning', true, 'Min positions 8'],
  ['min_market_cap', { value: 5000000000 }, 'warning', true, 'Min market cap $5B'],
  ['cash_floor_pct', { pct: 5 }, 'warning', true, 'Cash floor 5%'],
  ['prohibited_ticker', { ticker: 'MO' }, 'block', true, 'Prohibited ticker MO'],
  ['prohibited_sector', { sector: 'Tobacco' }, 'block', false, 'Prohibited sector Tobacco'],
];

/**
 * @param {{ role?: string, displayName?: string, userId?: string, now?: number }} opts
 */
export function buildComplianceSample({
  role = 'executive',
  displayName,
  userId,
  now = Date.now(),
} = {}) {
  const iso = (days, hours = 0) => new Date(now - days * DAY + hours * 3600000).toISOString();

  const rules = RULES.map(([rule_type, value, severity, is_active, label], i) => ({
    id: id('rule', i + 1),
    org_id: 'sample',
    rule_type,
    rule_value: { ...value, severity },
    label,
    is_active,
    created_at: iso(120 - i * 6),
    is_demo: true,
  }));
  const ruleId = (type) => rules.find((r) => r.rule_type === type)?.id || null;

  /* Holdings: the Trading Desk sample's positions, under their team's sector. */
  const desk = buildTradingDeskSample({ userId, role, displayName, now });
  const teamName = new Map((desk.roster?.teams || []).map((t) => [t.id, t.name]));
  const positions = (desk.book?.positions || []).map((p) => ({
    id: p.id,
    ticker_symbol: p.ticker_symbol,
    sector: teamName.get(p.team_id) || null,
    current_value: p.current_value,
    is_demo: true,
  }));

  /* Open breaches: what pitch submission can actually log (ticker and size). */
  const violations = [
    {
      id: id('breach', 1),
      org_id: 'sample',
      rule_id: ruleId('prohibited_ticker'),
      source_type: 'pitch',
      source_id: null,
      ticker: 'MO',
      detail: 'Prohibited ticker MO: MO is on the prohibited-securities list.',
      severity: 'block',
      resolved: false,
      created_at: iso(2, -3),
      is_demo: true,
    },
    {
      id: id('breach', 2),
      org_id: 'sample',
      rule_id: ruleId('max_single_trade_pct'),
      source_type: 'pitch',
      source_id: null,
      ticker: 'ORCL',
      detail: 'Max single trade 8%: Trade size 10% exceeds the 8% single-trade limit.',
      severity: 'warning',
      resolved: false,
      created_at: iso(4, -6),
      is_demo: true,
    },
  ];

  const resolved = [
    {
      id: id('breach', 3),
      org_id: 'sample',
      rule_id: ruleId('max_single_trade_pct'),
      source_type: 'pitch',
      source_id: null,
      ticker: 'GS',
      detail: 'Max single trade 8%: Trade size 9% exceeds the 8% single-trade limit.',
      severity: 'warning',
      resolved: true,
      created_at: iso(8, -2),
      resolved_at: iso(7, -1),
      resolved_by_name: 'Chidi Okoye',
      resolution_reason: 'Pitch resubmitted at 6% after the sector team review.',
      is_demo: true,
    },
    {
      id: id('breach', 4),
      org_id: 'sample',
      rule_id: ruleId('max_positions'),
      source_type: 'pitch',
      source_id: null,
      ticker: 'LIN',
      detail: 'Max positions 20: Adding LIN would exceed the 20-position maximum.',
      severity: 'warning',
      resolved: true,
      created_at: iso(41),
      resolved_at: iso(39),
      resolved_by_name: 'Selam Haile',
      resolution_reason: 'Council exited a position before the pitch vote.',
      is_demo: true,
    },
  ];

  const me = displayName || 'You';
  const activity = [
    ['Chidi Okoye', 'ips_breach_resolved', 'ips_violation', { ticker: 'GS' }, iso(7, -1)],
    [me, 'ips_rule_disabled', 'ips_rule', { label: 'Prohibited sector Tobacco' }, iso(9, -4)],
    [
      me,
      'ips_rule_added',
      'ips_rule',
      { label: 'Prohibited ticker MO', severity: 'block' },
      iso(12, -2),
    ],
    [me, 'fund_config_updated', 'org', { fields: ['benchmark_symbol', 'term_end'] }, iso(15, -5)],
    [me, 'role_changed', 'member', { role: 'portfolio_manager' }, iso(44, -3)],
    [me, 'member_invited', 'member', null, iso(52, -1)],
  ].map(([actor_name, action, target_type, detail, created_at], i) => ({
    id: id('activity', i + 1),
    actor_name,
    action,
    target_type,
    detail,
    created_at,
    is_demo: true,
  }));

  return { rules, violations, resolved, positions, activity, is_demo: true };
}
