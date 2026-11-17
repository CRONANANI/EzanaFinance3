/**
 * Sample content for the Council sandbox on Mock Portfolio (/trading/mock).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/mock-portfolio/sample, so the council layer can be presented
 * from a council with little activity. Real councils never receive it, the
 * page labels it "Sample content" while it shows, and nothing done to it is
 * saved: the council cards are read-only, and the viewer's own paper orders,
 * resets and theses keep going to their own routes exactly as before.
 *
 * It is the same sample council every rebuilt Team Hub page shows, assembled
 * from those bundles rather than typed in again (the book, sector teams,
 * members and stored policy rules come from the US Equities sample, which the
 * page loads through the same fund loader):
 *   - the open pitches from the Pitch Pipeline sample,
 *   - the fund's daily values from the Command Center sample,
 *   - the fund challenge standing from the Competitions sample (3 of 12),
 *   - the holdings filed under their sector team from the Compliance sample,
 *     which is what the policy rules read.
 * The sample sandbox below holds five of the fund's own names at the fund's
 * own prices, bought from a $100,000.00 start. Every name is invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildPitchPipelineSample } from './org-pitch-pipeline-sample.js';
import { buildCommandCenterSample } from './org-command-center-sample.js';
import { buildCompetitionsSample } from './org-competitions-sample.js';
import { buildComplianceSample } from './org-compliance-sample.js';
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { CLOSED_PITCH_STAGES } from './org-mock-portfolio-model.js';

const DAY = 86400000;
const SANDBOX_START = 100000;
const SANDBOX_DAYS = 90;

/* [ticker, shares, average cost]. Prices are the fund book's own. */
const SANDBOX = [
  ['NVDA', 150, 118.0],
  ['GE', 90, 214.0],
  ['JPM', 45, 322.0],
  ['LLY', 15, 960.0],
  ['AAPL', 20, 262.0],
];

const cents = (v) => Math.round(v * 100) / 100;
/* Deterministic wobble, so the sample chart is the same on every load. */
const wobble = (i) => Math.sin(i * 0.53) * 0.004 + Math.sin(i * 0.19) * 0.006;

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildMockPortfolioSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const v = { userId, memberId, role, displayName, title, subRole, now };
  const pipeline = buildPitchPipelineSample(v).raw;
  const center = buildCommandCenterSample({ userId, role, displayName, title, now });
  const competitions = buildCompetitionsSample(v);
  const compliance = buildComplianceSample({ role, displayName, userId, now });
  const desk = buildTradingDeskSample(v);

  const pitches = pipeline.pitches
    .filter((p) => p.ticker && !p.archived_at && !CLOSED_PITCH_STAGES.includes(p.stage))
    .map((p) => ({
      id: p.id,
      ticker: p.ticker,
      company_name: p.company_name,
      stage: p.stage,
      status: p.status,
      analyst_member_id: p.analyst_member_id,
      expected_return_pct: p.expected_return_pct ?? null,
      created_at: p.created_at,
      archived_at: null,
      is_demo: true,
    }));

  const snapshots = center.summary.snapshots.map((s) => ({
    date: s.date,
    value: s.value,
    is_demo: true,
  }));

  /* ── The sample sandbox ── */
  const book = new Map(desk.book.positions.map((p) => [p.ticker, p]));
  const sector = new Map(compliance.positions.map((p) => [p.ticker_symbol, p.sector]));
  const positions = SANDBOX.map(([ticker, qty, avgCost]) => {
    const p = book.get(ticker);
    return {
      symbol: ticker,
      name: p?.name || ticker,
      qty,
      avgCost,
      currentPrice: p?.current_price ?? avgCost,
      sector: sector.get(ticker) || null,
      is_demo: true,
    };
  });
  const cost = positions.reduce((s, p) => s + p.qty * p.avgCost, 0);
  const cash = cents(SANDBOX_START - cost);
  const total = cents(cash + positions.reduce((s, p) => s + p.qty * p.currentPrice, 0));

  /* Daily values: a gradual climb from the start to today's total, and the
     S&P 500 from the Command Center's benchmark over the same days, rebased
     to the sandbox's first value (the shape the series route returns). */
  const benchTail = center.summary.snapshots.slice(-(SANDBOX_DAYS + 1));
  const points = [];
  for (let i = 0; i <= SANDBOX_DAYS; i += 1) {
    const f = i / SANDBOX_DAYS;
    const drift = i === SANDBOX_DAYS || i === 0 ? 0 : wobble(i);
    const value = SANDBOX_START + (total - SANDBOX_START) * f * (1 + drift * 8) + drift * 900;
    const at = new Date(now - (SANDBOX_DAYS - i) * DAY).toISOString().slice(0, 10);
    points.push({ at: `${at}T16:00:00.000Z`, value: cents(i === 0 ? SANDBOX_START : value) });
  }
  const b0 = benchTail[0]?.benchmarkValue || 1;
  const benchmark = benchTail.map((s, i) => ({
    t: points[Math.min(i, points.length - 1)].at,
    v: cents((s.benchmarkValue / b0) * SANDBOX_START),
  }));

  return {
    is_demo: true,
    now,
    viewer: { role, memberId: pipeline.viewer?.id || memberId || null },
    members: (pipeline.members || []).map((m) => ({
      id: m.id,
      display_name: m.display_name,
      is_demo: true,
    })),
    pitches,
    snapshots,
    challenges: competitions.fund,
    /* What the policy rules read for the fund: holdings under their team. */
    policyPositions: compliance.positions,
    sandbox: {
      startingCash: SANDBOX_START,
      cash,
      total,
      positions,
      points,
      benchmark,
      is_demo: true,
    },
  };
}
