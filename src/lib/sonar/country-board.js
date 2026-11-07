/**
 * The country answer board (Nov 2026): pure view helpers for SonarCountryBoard.jsx and the
 * resources belt (SonarSourceBelt.jsx). No I/O, no React: every function reads the ping
 * response (`live`) or its dossier and returns plain data, so the layout is testable in node
 * (scripts/check-sonar-country-board.mjs).
 *
 * Copy rules: sentence case, no em dashes, findings only. Every figure shown comes from the
 * dossier; nothing here invents a number.
 */
import { packDetailRows } from './country-intel-view.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const clip = (s, n) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const ordinal = (n) => {
  const v = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const m = v % 100;
  return `${v}${s[(m - 20) % 10] || s[m] || s[0]}`;
};
const minus = (s) => String(s).replace(/(^|\s|\()-(?=\d)/g, '$1−');
export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/* ------------------------------------------------------------------ headline */

const YES_NO = { low: 'No.', moderate: 'Somewhat.', elevated: 'Yes.', severe: 'Yes.' };
/* A yes/no question about pressure, weakness or a crisis earns a one-word lead. */
const YES_NO_Q =
  /^\s*(is|are|has|have|does|do)\b[^?]*\b(pressure|weak|weaken|under|crisis|collaps|fall|slid|slump|depreciat|devalu|risk|trouble)/i;

/**
 * The executive answer's headline: "Yes. Pressure on the lira is elevated." for a yes/no
 * currency question with a rated assessment; otherwise the brief's first sentence.
 */
export function boardHeadline({ intel, query } = {}) {
  const overall = intel?.overall;
  const short = intel?.currency?.short || intel?.currency?.name || 'currency';
  if (intel?.focus === 'FX risk' && overall) {
    const lead = YES_NO_Q.test(String(query || '')) ? YES_NO[overall] : null;
    const line = `pressure on the ${short} is ${overall}.`;
    return lead
      ? `${lead} ${line[0].toUpperCase()}${line.slice(1)}`
      : `${line[0].toUpperCase()}${line.slice(1)}`;
  }
  const text = intel?.brief?.answer || intel?.fallbackText || '';
  const first = String(text).split(/(?<=[.!?])\s+/)[0] || '';
  return clip(first, 140) || null;
}

/** The executive answer's body: the brief's answer, then up to five drivers as bullets. */
export function boardAnswer(intel) {
  const brief = intel?.brief || null;
  if (brief) {
    return {
      text: brief.answer || null,
      detail: brief.assessmentLine || null,
      bullets: (brief.drivers || [])
        .filter((d) => d && (d.title || d.text))
        .slice(0, 5)
        .map((d) => ({ title: d.title || null, text: d.text || '' })),
    };
  }
  const paras = String(intel?.fallbackText || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { text: paras[0] || null, detail: paras.slice(1, 3).join(' ') || null, bullets: [] };
}

/* ------------------------------------------------------------------ KPI tiles */

/** Evenly thinned values (keeps the last point), at most `max`. */
export function thin(values, max = 48) {
  const v = (values || []).filter(num);
  if (v.length <= max) return v;
  const out = [];
  const step = (v.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(v[Math.round(i * step)]);
  return out;
}

const pts = (chart) => (chart?.points || []).filter((p) => p && num(Number(p.y)));
const lastYear = (points) => {
  if (!points.length) return [];
  const end = Date.parse(points[points.length - 1].x);
  if (!Number.isFinite(end)) return points.slice(-12);
  const from = end - 366 * 86400000;
  return points.filter((p) => Date.parse(p.x) >= from);
};

const GDP_STORY = (s) => s && (s.slug === 'eo-gdpv_annpct' || s.family === 'gdp_growth');

/**
 * Up to four KPI tiles for the intel card, each with a sparkline series:
 * the exchange rate (last year), inflation and the policy rate (last three years), then
 * reserves when Ezana holds them, else real GDP growth (bars, last eight years).
 * -> [{ id, label, value, period, change, stale, spark: number[], kind: 'line'|'step'|'bars' }]
 */
export function boardKpis(dossier) {
  const intel = dossier?.intel || {};
  const charts = intel.charts || {};
  const sparkOf = {
    fx: () => {
      const d = pts(charts.fx);
      const series = d.length >= 8 ? lastYear(d) : lastYear(pts(charts.fxMonthly));
      return { spark: thin(series.map((p) => Number(p.y))), kind: 'line' };
    },
    inflation: () => ({
      spark: thin(
        pts(charts.inflation)
          .slice(-36)
          .map((p) => Number(p.y)),
      ),
      kind: 'line',
    }),
    policy: () => ({
      spark: thin(
        pts(charts.policy)
          .slice(-36)
          .map((p) => Number(p.y)),
      ),
      kind: 'step',
    }),
    reserves: () => ({
      spark: thin(
        pts(charts.reserves)
          .slice(-24)
          .map((p) => Number(p.y)),
      ),
      kind: 'line',
    }),
  };
  const tiles = (intel.kpis || [])
    .filter((k) => k && k.value != null && k.value !== '')
    .map((k) => ({
      id: k.id,
      label: k.label,
      value: minus(k.value),
      period: k.period || null,
      change: k.change ? minus(k.change) : null,
      stale: Boolean(k.stale),
      ...(sparkOf[k.id] ? sparkOf[k.id]() : { spark: [], kind: 'line' }),
    }));

  if (tiles.length < 4 && !tiles.some((t) => t.id === 'gdp')) {
    const stories = dossier?.keyChart?.stories?.length
      ? dossier.keyChart.stories
      : dossier?.oecd?.stories || [];
    const g = stories.find(GDP_STORY);
    const actual = (g?.points || []).filter((p) => !p.proj && num(p.value));
    if (g && actual.length) {
      const last = actual[actual.length - 1];
      tiles.push({
        id: 'gdp',
        label: 'Real GDP growth',
        value: minus(`${last.value.toFixed(g.decimals ?? 1)}%`),
        period: String(last.label ?? last.year),
        change: null,
        stale: false,
        spark: actual.slice(-8).map((p) => p.value),
        kind: 'bars',
      });
    } else {
      const row = (dossier?.keyIndicators || []).find((r) =>
        /gdp growth|real gdp/i.test(r?.label || ''),
      );
      const m = row && /−?-?\d+(?:\.\d+)?%?/.exec(String(row.value || ''));
      if (m) {
        tiles.push({
          id: 'gdp',
          label: 'Real GDP growth',
          value: minus(m[0].includes('%') ? m[0] : `${m[0]}%`),
          period: row.period || null,
          change: null,
          stale: false,
          spark: [],
          kind: 'bars',
        });
      }
    }
  }
  return tiles.slice(0, 4);
}

/**
 * SVG geometry for a sparkline in a `w` x `h` box. kind 'line' and 'step' -> { d } (a path),
 * 'bars' -> { bars: [{ x, y, w, h }] }. Null with fewer than two values (one bar is fine).
 */
export function sparkGeometry(values, { w = 64, h = 24, kind = 'line', pad = 2 } = {}) {
  const v = (values || []).filter(num);
  if (kind === 'bars') {
    if (!v.length) return null;
    const lo = Math.min(0, ...v);
    const hi = Math.max(0, ...v);
    const span = hi - lo || 1;
    const gap = 2;
    const bw = Math.max(1, (w - gap * (v.length - 1)) / v.length);
    const y0 = pad + ((hi - 0) / span) * (h - 2 * pad);
    return {
      bars: v.map((val, i) => {
        const y = pad + ((hi - Math.max(val, 0)) / span) * (h - 2 * pad);
        const bh = Math.max(1, (Math.abs(val) / span) * (h - 2 * pad));
        return {
          x: +(i * (bw + gap)).toFixed(2),
          y: +(val >= 0 ? y : y0).toFixed(2),
          w: +bw.toFixed(2),
          h: +bh.toFixed(2),
        };
      }),
    };
  }
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const x = (i) => +(pad + (i / (v.length - 1)) * (w - 2 * pad)).toFixed(2);
  const y = (val) => +(h - pad - ((val - lo) / span) * (h - 2 * pad)).toFixed(2);
  let d = `M${x(0)} ${y(v[0])}`;
  for (let i = 1; i < v.length; i++) {
    d += kind === 'step' ? ` H${x(i)} V${y(v[i])}` : ` L${x(i)} ${y(v[i])}`;
  }
  return { d, end: { x: x(v.length - 1), y: y(v[v.length - 1]) } };
}

/* ------------------------------------------------------------------ dataset evidence */

/**
 * One row per Ezana dataset that contributed to this country answer, in the band's order:
 * OECD, Empire Rankings, macro data, Echo, prediction markets, then any other dataset the
 * brief cited (from live.evidence). Each row: { id, chip, dataset, title, summary, bullets,
 * href, linkLabel, external }.
 */
export function datasetEvidence(live) {
  const d = live?.dossier || {};
  const m = d.matches || {};
  const name = d.name || 'the country';
  const rows = [];

  if (m.oecd?.headline?.length) {
    const o = m.oecd;
    rows.push({
      id: 'oecd-macro',
      chip: 'OECD',
      dataset: 'OECD Economic Outlook',
      title: `${name}: macroeconomic indicators`,
      summary: `OECD Economic Outlook series for ${name}, with its rank among OECD economies where one exists.`,
      bullets: o.headline.slice(0, 4).map((h) => {
        const v = num(h.latest?.value)
          ? `${h.latest.value.toFixed(h.decimals ?? 1)}${/%/.test(h.unit || '') ? '%' : ''}`
          : 'n/a';
        const rank = h.peer ? `, ${ordinal(h.peer.rank)} of ${h.peer.of}` : '';
        return minus(`${h.short || h.label}: ${v} (${h.latest?.year ?? ''}${rank})`);
      }),
      href: o.area ? `/datasets/oecd-macro?a=${encodeURIComponent(o.area)}` : null,
      linkLabel: 'Open in OECD Macro',
    });
  }
  if (m.empire) {
    const e = m.empire;
    rows.push({
      id: 'empire',
      chip: 'EMPIRE',
      dataset: 'Global Empire Rankings',
      title: `${name} in the Global Empire Rankings`,
      summary: e.rank
        ? `${ordinal(e.rank)} of ${e.of} on Ezana's composite, ${e.coverage?.present ?? '?'} of ${e.coverage?.total ?? '?'} dimensions scored (${e.year}).`
        : `Too few live dimensions for a composite rank (${e.coverage?.present ?? 0} of ${e.coverage?.total ?? 0}).`,
      bullets: (e.top || [])
        .slice(0, 3)
        .map(
          (t) => `${t.name}: ${ordinal(t.rank)} of ${t.of} (score ${Number(t.score).toFixed(1)})`,
        ),
      href: e.href || '/datasets/empire-rankings',
      linkLabel: 'Open Global Empire Rankings',
    });
  }
  if (m.macro?.publishers?.length) {
    rows.push({
      id: 'macro',
      chip: 'MACRO',
      dataset: 'Macro data',
      title: `${name}: headline indicators`,
      summary: `${m.macro.count} headline indicator${m.macro.count === 1 ? '' : 's'} from ${m.macro.publishers.join('; ')}.`,
      bullets: (d.keyIndicators || [])
        .slice(0, 3)
        .map((r) => minus(`${r.label}: ${clip(r.value, 40)} (${r.period})`)),
      href: null,
      linkLabel: null,
    });
  }
  if (Array.isArray(m.echo) && m.echo.length) {
    const [a, ...rest] = m.echo;
    rows.push({
      id: 'echo',
      chip: 'ECHO',
      dataset: 'Ezana Echo',
      title: a.title,
      summary: a.excerpt ? clip(a.excerpt, 220) : null,
      bullets: rest.slice(0, 2).map((r) => clip(r.title, 90)),
      href: a.slug ? `/echo/${a.slug}` : null,
      linkLabel: 'Read in Echo',
    });
  }
  if (Array.isArray(m.markets) && m.markets.length) {
    rows.push({
      id: 'prediction-markets',
      chip: 'MARKETS',
      dataset: 'Prediction markets',
      title: `Prediction markets on ${name}`,
      summary: `${m.markets.length} open market${m.markets.length === 1 ? '' : 's'} that name ${name}. Market odds, not forecasts by Ezana.`,
      bullets: m.markets
        .slice(0, 3)
        .map((mk) =>
          num(mk.probability)
            ? `${clip(mk.question, 80)}: ${Math.round(mk.probability * 100)}% yes${mk.platform ? ` (${mk.platform})` : ''}`
            : clip(mk.question, 90),
        ),
      href: null,
      linkLabel: null,
    });
  }
  /* Any other dataset the brief cited (US Sanctions, contracts, filings): its first item. */
  const label = new Map((live?.sources || []).map((s) => [s.id, s.label]));
  const seen = new Set(rows.map((r) => r.id));
  for (const ev of live?.evidence || []) {
    if (!ev?.dataset || seen.has(ev.dataset)) continue;
    seen.add(ev.dataset);
    const more = (live.evidence || []).filter((x) => x.dataset === ev.dataset).slice(1, 3);
    rows.push({
      id: ev.dataset,
      chip: String(label.get(ev.dataset) || ev.dataset).toUpperCase(),
      dataset: label.get(ev.dataset) || ev.dataset,
      title: clip(ev.title, 120),
      summary: ev.snippet ? clip(ev.snippet, 220) : null,
      bullets: more.map((x) => clip(x.title, 90)),
      href: ev.url || null,
      linkLabel: ev.url ? 'Open the record' : null,
      external: Boolean(ev.url && /^https?:/i.test(ev.url)),
    });
  }
  return rows;
}

/**
 * The source coverage chips: each contributing dataset with what it matched, then the open
 * web and the news when the brief read them. -> [{ id, label, detail }]
 */
export function sourceCoverage(live) {
  const name = live?.dossier?.name || '';
  const out = datasetEvidence(live).map((r) => ({
    id: r.id,
    label: r.dataset,
    detail:
      r.id === 'oecd-macro'
        ? `${name}, macro (matched)`
        : r.id === 'empire'
          ? `${name}, composite (matched)`
          : r.id === 'macro'
            ? `${name}, ${clip((live.dossier.matches.macro.publishers || []).map((p) => String(p).split(/[,(]/)[0].trim()).join(', '), 48)}`
            : r.id === 'echo'
              ? `${(live.dossier.matches.echo || []).length} article${(live.dossier.matches.echo || []).length === 1 ? '' : 's'}`
              : r.id === 'prediction-markets'
                ? `${live.dossier.matches.markets.length} market${live.dossier.matches.markets.length === 1 ? '' : 's'}`
                : 'cited in the brief',
  }));
  const web = (live?.webSources || []).length;
  if (web)
    out.push({ id: 'web', label: 'Open web', detail: `${web} page${web === 1 ? '' : 's'} read` });
  const news = (live?.newsColumns || []).reduce((n, c) => n + (c?.items?.length || 0), 0);
  if (news)
    out.push({ id: 'news', label: 'News', detail: `${news} stor${news === 1 ? 'y' : 'ies'}` });
  return out;
}

/* ------------------------------------------------------------------ resources belt */

/** "Bank for International Settlements, BIS Statistics (data.bis.org)" -> { label, host }. */
export function parseCitation(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const m = /^(.*?)\s*\(([a-z0-9.-]+\.[a-z]{2,}(?:\/[^)]*)?)\)\s*\.?$/i.exec(t);
  if (m) return { label: m[1].replace(/[;,]\s*$/, ''), host: m[2].split('/')[0] };
  return { label: t.replace(/\.$/, ''), host: null };
}

/**
 * Every resource this ping used, for the conveyor belt at the top of the answer: Ezana
 * datasets that matched, the data publishers behind the figures, the web pages the brief
 * read and the news it surfaced. Deduplicated, most authoritative first, at most `max`.
 * -> [{ key, kind: 'dataset'|'publisher'|'web'|'news', label, sub, href, external }]
 */
export function pingResources(live, { max = 40 } = {}) {
  if (!live) return [];
  const out = [];
  const seen = new Set();
  const add = (r) => {
    const key = `${r.kind}:${(r.href || r.label).toLowerCase()}`;
    if (!r.label || seen.has(key)) return;
    seen.add(key);
    out.push({ ...r, key });
  };
  const matched = new Set(datasetEvidence(live).map((r) => r.id));
  for (const s of live.sources || []) {
    if (s?.used || matched.has(s?.id))
      add({ kind: 'dataset', label: s.label, sub: 'Ezana dataset', href: null });
  }
  for (const r of datasetEvidence(live)) {
    add({
      kind: 'dataset',
      label: r.dataset,
      sub: 'Ezana dataset',
      href: r.href && !r.external ? r.href : null,
    });
  }
  const cites = [
    ...(live.dossier?.intel?.sources || []),
    ...(live.dossier?.matches?.macro?.publishers || []),
  ];
  for (const c of cites) {
    const p = parseCitation(c);
    if (p)
      add({
        kind: 'publisher',
        label: clip(p.label, 60),
        sub: p.host || 'Data publisher',
        href: p.host ? `https://${p.host}` : null,
        external: Boolean(p.host),
      });
  }
  for (const w of live.webSources || []) {
    if (w?.url)
      add({
        kind: 'web',
        label: clip(w.title || hostOf(w.url), 60),
        sub: hostOf(w.url),
        href: w.url,
        external: true,
      });
  }
  for (const col of live.newsColumns || []) {
    for (const n of col?.items || []) {
      if (n?.url)
        add({
          kind: 'news',
          label: clip(n.title, 60),
          sub: n.source || hostOf(n.url),
          href: n.url,
          external: true,
        });
    }
  }
  return out.slice(0, max);
}

/* ------------------------------------------------------------------ layout */

/**
 * The board's cells, packed 12 wide (and 6 at mid width) so every row is filled edge to
 * edge. cells: [{ id, span, min, mid? }] in reading order; `mid` pins the 6-column width
 * (a wide table that needs the whole row at mid width) -> Map(id -> { wide, mid }).
 */
export function boardSpans(cells) {
  const wide = new Map(packDetailRows(cells, 12).map((c) => [c.id, c.span]));
  const mid = new Map(
    packDetailRows(
      cells.map((c) => ({
        id: c.id,
        span: c.mid || Math.max(3, Math.round(c.span / 2)),
        min: c.mid || Math.max(3, Math.round((c.min || c.span) / 2)),
      })),
      6,
    ).map((c) => [c.id, c.span]),
  );
  return new Map(cells.map((c) => [c.id, { wide: wide.get(c.id), mid: mid.get(c.id) }]));
}

/** Columns for the key macro charts row: 1 to 3 across; four charts sit two by two. */
export const chartColumns = (n) => (n >= 4 ? 2 : Math.max(1, Math.min(3, n)));
