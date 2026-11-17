/**
 * Sonar adaptive research: the report contract (Nov 2026).
 *
 * An adaptive report is an ordered list of typed sections plus the sources
 * they cite. This module is the gate between research and the page: a section
 * that fails its rule is removed (and the removal recorded), never repaired
 * with a guess. What reaches the renderer has already been checked:
 *
 *   - every section type is one the renderer knows
 *   - every citation id points at a source in the report
 *   - every source link is an https address
 *   - a price chart section carries at least 30 real bars
 *   - a market is shown only with its venue link and the time it was indexed
 *   - a candidate is shown only with at least one citation
 *
 * Pure. No I/O.
 */
import { SECTION_TYPES } from './profiles';

export const REPORT_VERSION = 'arie-report-v1';

export const EVENT_STATUSES = {
  event_verified: 'Event confirmed',
  event_unconfirmed: 'Not confirmed',
  hypothetical: 'Hypothetical',
  event_superseded: 'Superseded',
  event_contradicted: 'Contradicted by sources',
};

export const CANDIDATE_BASES = {
  board_confirmed: 'Named by the company',
  reported: 'Named in reporting',
  analysis: 'Named in third-party analysis',
};

const isHttps = (u) => /^https:\/\/[^\s]+$/.test(String(u || ''));
const text = (v) => typeof v === 'string' && v.trim().length > 0;

/* A table needs its columns and at least one row, and every row a cell per column. */
const table = (s) =>
  s.columns?.length &&
  s.rows?.length &&
  s.rows.every((r) => r.cells && s.columns.every((c) => c.key in r.cells))
    ? null
    : 'needs columns and complete rows';

/* A chart is drawn only from real numbers: every series as long as the category axis, and at
   least two finite values in each. Anything less is removed, never padded. */
const chart = (s) => {
  const n = s.categories?.length || 0;
  if (n < 2 || !s.series?.length) return 'needs at least two categories and one series';
  for (const sr of s.series) {
    if (!text(sr.name) || !Array.isArray(sr.values) || sr.values.length !== n)
      return 'series do not match the category axis';
    if (sr.values.some((v) => v != null && !(typeof v === 'number' && Number.isFinite(v))))
      return 'a series holds a value that is not a number';
    if (sr.values.filter((v) => typeof v === 'number').length < 2)
      return 'fewer than two real values in a series';
  }
  return null;
};

const RULES = {
  lead: (s) => (text(s.headline) && text(s.text) ? null : 'needs a headline and text'),
  verified_event_status: (s) =>
    EVENT_STATUSES[s.status] && text(s.summary) ? null : 'needs a known status and a summary',
  key_findings: (s) => (s.items?.length ? null : 'no findings'),
  ohlcv_technical: (s) =>
    Array.isArray(s.series) && s.series.length >= 30 && text(s.symbol) && text(s.asOf)
      ? null
      : 'needs at least 30 real bars, a symbol and an as-of date',
  metric_table: (s) => (s.rows?.length ? null : 'no rows'),
  price_comparison: (s) => (text(s.chart?.subject?.symbol) ? null : 'no symbol'),
  forecast_market: (s) => (s.markets?.length ? null : 'no matching market'),
  candidate_table: (s) =>
    s.rows?.length || text(s.emptyText) ? null : 'no rows and no empty state',
  news_timeline: (s) => (s.items?.length ? null : 'no items'),
  scenario_matrix: (s) => (s.rows?.length ? null : 'no scenarios'),
  impact_network: (s) => (s.rows?.length ? null : 'no rows'),
  valuation: (s) => table(s),
  ranking: (s) => table(s),
  data_table: (s) => table(s),
  sector_exposure: (s) => table(s),
  policy_tracker: (s) => table(s),
  macro_timeseries: (s) => table(s),
  heatmap: (s) => table(s),
  portfolio_attribution: (s) => table(s),
  catalyst_calendar: (s) => table(s),
  series_chart: (s) => chart(s),
  risk: (s) => (s.items?.length ? null : 'no items'),
  fundamentals: (s) => (s.items?.length ? null : 'no figures'),
  watchpoints: (s) => (s.items?.length ? null : 'no items'),
  limitations: (s) => (s.items?.length ? null : 'no items'),
  followups: (s) => (s.related?.length ? null : 'no questions'),
  sources: () => null,
};

/**
 * Check a report and return it with every failing part removed.
 * @returns {{ ok: boolean, report: object, removed: string[] }}
 */
export function validateReport(input) {
  const removed = [];
  const sources = [];
  const ids = new Set();
  for (const s of input?.sources || []) {
    if (!text(s?.id) || !text(s?.title) || ids.has(s.id)) {
      removed.push(`source ${s?.id || '?'}: incomplete or duplicate`);
      continue;
    }
    if (s.url != null && !isHttps(s.url)) {
      removed.push(`source ${s.id}: link is not https`);
      continue;
    }
    ids.add(s.id);
    sources.push(s);
  }
  const keepCites = (list) => (Array.isArray(list) ? list.filter((c) => ids.has(c)) : []);

  const sections = [];
  for (const raw of input?.sections || []) {
    if (!raw || !SECTION_TYPES.includes(raw.type)) {
      removed.push(`section ${raw?.type || '?'}: unknown type`);
      continue;
    }
    const s = { ...raw };
    if (s.cites) s.cites = keepCites(s.cites);
    if (s.type === 'verified_event_status' && s.facts) {
      s.facts = s.facts.map((f) => ({ ...f, cites: keepCites(f.cites) }));
      /* A confirmed event needs a source behind it. */
      if (
        s.status === 'event_verified' &&
        !s.cites.length &&
        !s.facts.some((f) => f.cites.length)
      ) {
        s.status = 'event_unconfirmed';
        removed.push('verified_event_status: no source for a confirmed status, downgraded');
      }
    }
    if (s.type === 'candidate_table') {
      const rows = (s.rows || [])
        .map((r) => ({ ...r, cites: keepCites(r.cites) }))
        .filter((r) => {
          const ok = text(r.name) && CANDIDATE_BASES[r.basis] && r.cites.length > 0;
          if (!ok) removed.push(`candidate ${r.name || '?'}: no citation or unknown basis`);
          return ok;
        });
      s.rows = rows;
      if (!rows.length && !text(s.emptyText)) {
        s.emptyText =
          'No credible list of candidates has been established in the sources reviewed.';
      }
    }
    if (s.type === 'forecast_market') {
      s.markets = (s.markets || []).filter((m) => {
        const ok =
          text(m.question) &&
          isHttps(m.url) &&
          text(m.indexedAt) &&
          Number.isFinite(m.yesPrice) &&
          m.yesPrice >= 0 &&
          m.yesPrice <= 1;
        if (!ok) removed.push(`market ${m.id || '?'}: missing link, time or price`);
        return ok;
      });
    }
    /* A reported figure with no source behind it is not shown. */
    if (s.type === 'fundamentals') {
      s.items = (s.items || [])
        .map((i) => ({ ...i, cites: keepCites(i.cites) }))
        .filter((i) => {
          const ok = text(i.label) && text(i.value) && i.cites.length > 0;
          if (!ok) removed.push(`figure ${i.label || '?'}: no citation`);
          return ok;
        });
    }
    if (s.type === 'key_findings' || s.type === 'risk') {
      s.items = (s.items || [])
        .map((i) => ({ ...i, cites: keepCites(i.cites) }))
        .map((i) =>
          /* A takeaway that lost its source is a reading, and says so. */
          i.cites.length || i.note ? i : { ...i, note: 'Analyst interpretation' },
        )
        .filter((i) => text(i.title) && text(i.text));
    }
    if (s.type === 'impact_network') {
      s.rows = (s.rows || [])
        .map((r) => ({ ...r, cites: keepCites(r.cites) }))
        .map((r) =>
          r.assessment === 'confirmed' && !r.cites.length
            ? { ...r, assessment: 'scenario', assessmentLabel: 'Scenario only' }
            : r,
        )
        .filter((r) => text(r.name) && text(r.channel));
    }
    if (s.type === 'news_timeline') {
      s.items = (s.items || []).filter((i) => {
        const ok = text(i.title) && (i.url == null || isHttps(i.url));
        if (!ok) removed.push('news item: no title or bad link');
        return ok;
      });
      s.items = s.items.map((i) => ({ ...i, cites: keepCites(i.cites) }));
    }
    const rule = RULES[s.type];
    const fault = rule ? rule(s) : null;
    if (fault) {
      removed.push(`section ${s.type}: ${fault}`);
      continue;
    }
    sections.push(s);
  }
  const hasLead = sections[0]?.type === 'lead';
  return {
    ok: hasLead,
    removed,
    report: { ...input, version: REPORT_VERSION, sections, sources },
  };
}
