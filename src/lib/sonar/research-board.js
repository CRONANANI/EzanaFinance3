/**
 * The research answer board (Nov 2026): pure view helpers for ResearchBoard.jsx, the
 * dashboard layout of a standard or deep research report ("Which countries produce the most
 * crude oil?"). No I/O and no React, so every number on the board is testable in node
 * (scripts/check-sonar-research-board.mjs).
 *
 * Every figure comes from the report, its metrics, its visualizations or its evidence. The
 * two derived figures (the leader's lead over second place, the top five's share of the
 * listed total) are plain arithmetic on one record's values and say which record and which
 * total they use. Copy rules: sentence case, no em dashes, findings only.
 */

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const toNum = (v) => (num(v) ? v : Number.isFinite(Number(v)) ? Number(v) : null);
const minus = (s) => String(s).replace(/(^|\s|\()-(?=\d)/g, '$1−');
const firstSentence = (t) => (String(t || '').split(/(?<=[.!?])\s+(?=[A-Z])/)[0] || '').trim();

/** "13791.94" -> "13,791.9"; up to `decimals`, grouped; `fixed` pads (table columns). */
export function fmtNum(v, { decimals = 1, fixed = false } = {}) {
  const n = toNum(v);
  if (n == null) return 'n/a';
  return minus(
    n.toLocaleString('en-US', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: fixed ? decimals : 0,
    }),
  );
}

/** A metric value for a tile: percent with a sign, ratio as a percent, else grouped. */
export function fmtMetric(m) {
  const n = toNum(m?.value);
  if (n == null) return 'n/a';
  if (m.unit === 'percent') return minus(`${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);
  if (m.unit === 'ratio' || m.unit === 'share of revenue') return minus(`${(n * 100).toFixed(1)}%`);
  if (m.unit === 'USD') {
    const a = Math.abs(n);
    if (a >= 1e9) return minus(`$${(n / 1e9).toFixed(1)}B`);
    if (a >= 1e6) return minus(`$${(n / 1e6).toFixed(1)}M`);
    return minus(`$${Math.round(n).toLocaleString('en-US')}`);
  }
  return fmtNum(n);
}

/* ------------------------------------------------------------------ the ranking */

/**
 * The report's ranking, if it has one: the first bars or leaderboard visualization with at
 * least two rows, a country ranking (macro_rank_*) first.
 * -> { id, title, unit, source, period, method, rows: [{ label, value, note }], total, of }
 */
export function rankingOf(visualizations) {
  const list = (visualizations || []).filter(
    (v) => v && (v.type === 'bars' || v.type === 'leaderboard') && (v.rows || []).length >= 2,
  );
  const v = list.find((x) => /^macro_rank_/.test(x.id || '')) || list[0];
  if (!v) return null;
  const rows = v.rows
    .map((r) => ({ label: r.label, value: toNum(r.value), note: r.note || r.sub || null }))
    .filter((r) => r.label && r.value != null);
  if (rows.length < 2) return null;
  const periodLabel =
    v.period?.label || [v.period?.from, v.period?.to].filter(Boolean).join(' to ') || '';
  /* "latest data: Jun 2026 for 215 countries" -> 215 (how many the source ranks). */
  const m = /for (\d[\d,]*) (countries|economies|companies|members)/i.exec(periodLabel);
  return {
    id: v.id,
    title: v.title || 'Ranking',
    unit: v.unit && v.unit !== 'value' ? v.unit : '',
    source: v.source || '',
    period: periodLabel,
    method: v.method || '',
    rows,
    total: rows.reduce((s, r) => s + r.value, 0),
    of: m ? { count: Number(m[1].replace(/,/g, '')), noun: m[2].toLowerCase() } : null,
  };
}

/** The top `n` rows with their share of the listed total, for the table and the snapshot. */
export function rankingRows(rank, n = 10) {
  if (!rank) return [];
  const top = rank.rows.slice(0, n);
  const total = top.reduce((s, r) => s + Math.max(0, r.value), 0) || 1;
  const max = Math.max(...top.map((r) => Math.abs(r.value)), 1e-9);
  /* One decimal across the column when any value has one, so the figures line up. */
  const fixed = top.some((r) => !Number.isInteger(r.value));
  return top.map((r, i) => ({
    rank: i + 1,
    label: r.label,
    value: r.value,
    display: fmtNum(r.value, { fixed }),
    note: r.note,
    share: (Math.max(0, r.value) / total) * 100,
    width: Math.max(2, (Math.abs(r.value) / max) * 100),
  }));
}

/* ------------------------------------------------------------------ executive answer */

/**
 * The headline: the conclusion's first sentence, else the leading finding's title.
 * A ranking with no conclusion that names its leader gets the ranking as the headline.
 */
export function boardHeadline(report, rank) {
  const c = report?.executiveConclusion?.text;
  /* The headline reads as a sentence: figures in brackets stay for the summary below. */
  if (c && (!rank || c.toLowerCase().includes(rank.rows[0].label.toLowerCase())))
    return firstSentence(c).replace(/\s*\([^)]*\d[^)]*\)/g, '');
  if (rank) {
    const rest = rank.rows.slice(1, 5).map((r) => r.label);
    const list = rest.length > 1 ? `${rest.slice(0, -1).join(', ')} and ${rest.at(-1)}` : rest[0];
    const measure = rank.title.replace(/^(highest|largest|most)\s+/i, '').toLowerCase();
    return `${rank.rows[0].label} ranks first on ${measure}, followed by ${list}.`;
  }
  return report?.keyFindings?.[0]?.title || null;
}

/** The paragraph under the headline: the rest of the conclusion, else the ranking's figures. */
export function boardSummary(report, rank) {
  const c = report?.executiveConclusion?.text || '';
  const head = firstSentence(c);
  const rest = c.slice(head.length).trim();
  if (rest) return rest;
  if (rank) {
    const unit = rank.unit ? ` ${rank.unit}` : '';
    const top = rank.rows.slice(0, 5);
    return `${rank.title}${unit ? ` (${rank.unit})` : ''}, latest observation per country: ${top
      .map((r) => `${r.label} ${fmtNum(r.value)}`)
      .join(', ')}.${rank.source ? ` Source: ${rank.source}.` : ''}`;
  }
  return c && head !== c ? '' : null;
}

/**
 * Up to five bullets: the ranking's two derived facts (lead over second, top five's share of
 * the listed total), then each other finding's title, then the first interpretation.
 * -> [{ text, kind: 'derived'|'finding'|'interpretation' }]
 */
export function boardBullets(report, rank) {
  const out = [];
  if (rank && rank.rows.length >= 2) {
    const [a, b] = rank.rows;
    if (b.value > 0) {
      const lead = ((a.value - b.value) / b.value) * 100;
      out.push({
        kind: 'derived',
        text: `${a.label} leads at ${fmtNum(a.value)}${rank.unit ? ` ${rank.unit}` : ''}, ${fmtNum(lead, { decimals: 0 })}% above ${b.label}.`,
      });
    }
    const listed = rank.rows.slice(0, 10);
    if (listed.length >= 6) {
      const total = listed.reduce((s, r) => s + Math.max(0, r.value), 0);
      const five = listed.slice(0, 5).reduce((s, r) => s + Math.max(0, r.value), 0);
      if (total > 0)
        out.push({
          kind: 'derived',
          text: `The top five hold ${fmtNum((five / total) * 100, { decimals: 0 })}% of the top ${listed.length} listed.`,
        });
    }
  }
  const leader = rank?.rows?.[0]?.label?.toLowerCase();
  for (const f of report?.keyFindings || []) {
    if (out.length >= 4) break;
    if (f.id === 'finding_rank') continue;
    if (
      leader &&
      String(f.title || '')
        .toLowerCase()
        .startsWith(leader)
    )
      continue;
    if (f.title)
      out.push({ kind: 'finding', text: /[.!?]$/.test(f.title) ? f.title : `${f.title}.` });
  }
  const a = (report?.analysis || [])[0];
  if (a?.text && out.length < 5) out.push({ kind: 'interpretation', text: firstSentence(a.text) });
  return out.slice(0, 5);
}

/* ------------------------------------------------------------------ KPI strip */

/**
 * Four tiles: the lead calculated metric (never a rank), confidence, what was screened, and
 * the methodology checks. Missing ones drop out.
 * -> [{ id, icon, value, label, sub }]
 */
export function boardKpis({
  metrics = [],
  run = null,
  plan = null,
  team = null,
  rank = null,
} = {}) {
  const out = [];
  const m = metrics.find((x) => x && x.unit !== 'rank' && toNum(x.value) != null);
  if (m)
    out.push({
      id: 'metric',
      icon: toNum(m.value) < 0 ? 'bi-graph-down-arrow' : 'bi-graph-up-arrow',
      value: fmtMetric(m),
      label: m.label.replace(/\s+over the period shown$/i, ''),
      sub: m.period?.label || null,
    });
  if (run?.confidence)
    out.push({
      id: 'confidence',
      icon: 'bi-shield-check',
      value: String(run.confidence).toUpperCase(),
      label: 'Confidence',
      sub: team?.audit?.total ? 'Multi-source, methodology-checked' : 'Multi-source',
    });
  if (rank?.of)
    out.push({
      id: 'universe',
      icon: 'bi-globe2',
      value: rank.of.count.toLocaleString('en-US'),
      label: `${rank.of.noun[0].toUpperCase()}${rank.of.noun.slice(1)} ranked`,
      sub: rank.source ? rank.source.split(',')[0] : null,
    });
  else if (plan?.universe?.count > 0)
    out.push({
      id: 'universe',
      icon: 'bi-buildings',
      value: Number(plan.universe.count).toLocaleString('en-US'),
      label: 'Companies screened',
      sub: plan.universe.basis || plan.universe.label || null,
    });
  const audit = team?.audit;
  const total = Number(audit?.total) || audit?.checks?.length || 0;
  if (total) {
    const passed = Number(audit?.passed ?? (audit?.checks || []).filter((c) => c.pass).length) || 0;
    out.push({
      id: 'checks',
      icon: 'bi-check2-circle',
      value: `${passed} of ${total}`,
      label: 'Methodology checks passed',
      sub: 'Calculation, data and source quality',
    });
  }
  return out;
}

/* ------------------------------------------------------------------ methodology */

/**
 * The methodology card's four lines, in plain words: how the answer was computed, the
 * period, the sources, and the main caveat.
 */
export function methodologyLines({
  rank = null,
  metrics = [],
  run = null,
  limitations = [],
  sourceLabels = {},
} = {}) {
  const lines = [];
  if (rank)
    lines.push({
      id: 'approach',
      icon: 'bi-list-ol',
      label: 'Approach',
      text: `Rank by each country's latest observation (${/^lowest/i.test(rank.title) ? 'lowest' : 'highest'} first), one source for all.`,
    });
  else if (metrics[0]?.method)
    lines.push({
      id: 'approach',
      icon: 'bi-calculator',
      label: 'Approach',
      text: `${metrics[0].label}: ${metrics[0].method}.`,
    });
  const periods = [
    rank?.period ? `Ranking: ${rank.period}.` : null,
    ...metrics
      .filter((m) => m.unit !== 'rank' && m.period?.label)
      .slice(0, 1)
      .map((m) => `${m.label.replace(/\s+over the period shown$/i, '')}: ${m.period.label}.`),
  ].filter(Boolean);
  if (periods.length)
    lines.push({ id: 'period', icon: 'bi-calendar3', label: 'Period', text: periods.join(' ') });
  const searched = (run?.methodology?.plan?.tasks || []).map(
    (t) => sourceLabels[t.source] || t.source,
  );
  const named = [rank?.source, ...searched].filter(Boolean);
  if (named.length)
    lines.push({
      id: 'sources',
      icon: 'bi-database',
      label: 'Sources',
      text: `${[...new Set(named)].join('; ')}.`,
    });
  if (limitations[0])
    lines.push({
      id: 'caveat',
      icon: 'bi-exclamation-triangle',
      label: 'Key caveat',
      text: limitations[0],
    });
  return lines;
}

/* ------------------------------------------------------------------ evidence */

/** Evidence grouped by category for the sources strip: [{ id, label, count }], in order. */
export function evidenceGroups(evidence = [], categories = []) {
  const by = new Map();
  for (const e of evidence || [])
    if (e?.category) by.set(e.category, (by.get(e.category) || 0) + 1);
  return categories
    .filter(([id]) => by.has(id))
    .map(([id, label]) => ({ id, label, count: by.get(id) }));
}

/** The evidence a finding cites, in marker order: [{ marker, title, text, url }]. */
export function citedEvidence(finding, evidence = []) {
  const byMarker = new Map((evidence || []).map((e) => [e.marker, e]));
  return (finding?.markers || [])
    .map((m) => byMarker.get(String(m).replace(/[[\]]/g, '')))
    .filter(Boolean);
}

/* ------------------------------------------------------------------ resources belt */

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/**
 * Every resource a research run used, for the sources belt (SonarSourceBelt `items`):
 * the Ezana sources it searched and that returned evidence, the publishers named on its
 * charts, then each evidence record with a link. -> belt items.
 */
export function researchResources(state, { sourceLabels = {}, max = 40 } = {}) {
  const out = [];
  const seen = new Set();
  const add = (r) => {
    const key = `${r.kind}:${(r.href || r.label || '').toLowerCase()}`;
    if (!r.label || seen.has(key)) return;
    seen.add(key);
    out.push({ ...r, key });
  };
  const evidence = state?.run?.evidence || [];
  const used = new Set(evidence.map((e) => e.source));
  for (const t of state?.run?.methodology?.plan?.tasks || []) {
    if (used.has(t.source))
      add({
        kind: 'dataset',
        label: sourceLabels[t.source] || t.source,
        sub: 'Ezana dataset',
        href: null,
      });
  }
  for (const v of state?.analysis?.visualizations || []) {
    if (!v?.source) continue;
    const label = String(v.source).replace(/\s*\(public domain\)\s*$/i, '');
    add({
      kind: 'publisher',
      label: label.length > 60 ? `${label.slice(0, 59)}…` : label,
      sub: 'Data publisher',
      href: null,
    });
  }
  for (const e of evidence) {
    if (!e?.url || !/^https?:/i.test(e.url)) continue;
    add({
      kind: e.source === 'news' ? 'news' : 'web',
      label: e.title?.length > 60 ? `${e.title.slice(0, 59)}…` : e.title || hostOf(e.url),
      sub: hostOf(e.url),
      href: e.url,
      external: true,
    });
  }
  return out.slice(0, max);
}

/* ------------------------------------------------------------------ line chart */

/** 3 to 5 round ticks spanning [min, max] -> { ticks, lo, hi }. */
export function niceScale(min, max, count = 5) {
  if (!num(min) || !num(max)) return { ticks: [0, 1], lo: 0, hi: 1 };
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(1, count - 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((s) => s >= raw) || 10 * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step)
    ticks.push(+(Math.round(t / step) * step).toFixed(6));
  return { ticks, lo, hi };
}

/**
 * Geometry for the board's line chart in a 0..100 x 0..100 box (the SVG stretches; labels are
 * HTML): the line, the area under it, the y ticks and five x labels, plus the change chip.
 * series: [{ x, y }] oldest first. Null under two points.
 */
export function lineGeometry(series) {
  const s = (series || []).filter((p) => p && num(Number(p.y)));
  if (s.length < 2) return null;
  const ys = s.map((p) => Number(p.y));
  const lowV = Math.min(...ys);
  const highV = Math.max(...ys);
  const { ticks, lo, hi } = niceScale(lowV, highV, 5);
  const x = (i) => +((i / (s.length - 1)) * 100).toFixed(3);
  const y = (v) => +(100 - ((v - lo) / (hi - lo || 1)) * 100).toFixed(3);
  const line = s.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(Number(p.y))}`).join(' ');
  const first = ys[0];
  const last = ys[ys.length - 1];
  const xIdx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (s.length - 1)));
  return {
    line,
    area: `${line} L100 100 L0 100 Z`,
    ticks: ticks.map((t) => ({ value: t, y: y(t) })),
    xLabels: [...new Set(xIdx)].map((i) => ({ x: x(i), label: String(s[i].x) })),
    end: { x: 100, y: y(last) },
    first,
    last,
    low: lowV,
    high: highV,
    changePct: first ? ((last - first) / Math.abs(first)) * 100 : null,
    from: String(s[0].x),
    to: String(s[s.length - 1].x),
  };
}
