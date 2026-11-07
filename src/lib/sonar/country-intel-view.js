/**
 * Country & Currency Intelligence card: pure view helpers (Nov 2026).
 *
 * No imports and no I/O, so the card (SonarCountryStack / CountryIntelCard) and the node
 * tests share one implementation. Everything here shapes what the pipeline already put on
 * `dossier.intel`; nothing computes a new figure.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** True when the dossier carries an intel card worth rendering (hosts may then hide the plain brief). */
export function hasCountryIntel(dossier) {
  const i = dossier?.intel;
  return Boolean(i && (i.brief || i.fallbackText || (Array.isArray(i.kpis) && i.kpis.length)));
}

/** '2026-11-06' -> '6 Nov 2026'; '2026-09' -> 'Sep 2026'; anything else as given. */
export function dateLabel(p) {
  const s = String(p || '');
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)))
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  return s;
}

/** A chart x value ('2026-09', '2026-11-05', '2026-Q3', '2026') -> epoch ms at the period's start. */
export function periodMs(x) {
  const s = String(x ?? '');
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, 1);
  if ((m = /^(\d{4})-Q([1-4])$/.exec(s))) return Date.UTC(+m[1], (+m[2] - 1) * 3, 1);
  if ((m = /^(\d{4})$/.exec(s))) return Date.UTC(+m[1], 0, 1);
  return null;
}

/** A chart's points as { t, y, x } sorted by time, real numbers only. */
export function cleanPoints(chart) {
  return (chart?.points || [])
    .map((p) => ({ x: p?.x, t: periodMs(p?.x), y: typeof p?.y === 'number' ? p.y : Number(p?.y) }))
    .filter((p) => p.t != null && Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t);
}

/** Epoch ms `months` calendar months before `t`. */
function monthsBefore(t, months) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, d.getUTCDate());
}

/* Nov 7: 3M, 1Y, 3Y and 5Y (the one-month view read as noise beside the others). */
export const FX_WINDOWS = [
  { id: '3M', months: 3, label: 'three months' },
  { id: '1Y', months: 12, label: 'one year' },
  { id: '3Y', months: 36, label: 'three years' },
  { id: '5Y', months: 60, label: 'five years' },
];

/* A window counts as covered when the series' first point sits no later than this share of
   the window after its start (a daily series that begins 2 years back does not cover 5Y). */
const COVER_SLACK = 0.1;

function windowOf(points, months) {
  if (points.length < 2) return null;
  const last = points[points.length - 1].t;
  const from = monthsBefore(last, months);
  const pts = points.filter((p) => p.t >= from);
  const covered = points[0].t <= from + (last - from) * COVER_SLACK;
  return { pts, covered };
}

/**
 * The exchange-rate points for one window, relative to the series' own last point:
 * `fx` when it has at least two points in the window and reaches back far enough, else
 * `fxMonthly` (the five-year view of a daily series). null when neither has two points.
 * -> { points: [{ t, y, x }], chart } where `chart` is the series used (for its captions).
 */
export function fxWindow(fx, fxMonthly, months) {
  const a = windowOf(cleanPoints(fx), months);
  const b = fxMonthly ? windowOf(cleanPoints(fxMonthly), months) : null;
  if (a && a.pts.length >= 2 && (a.covered || !b || b.pts.length < 2 || !b.covered))
    return { points: a.pts, chart: fx };
  if (b && b.pts.length >= 2) return { points: b.pts, chart: fxMonthly };
  if (a && a.pts.length >= 2) return { points: a.pts, chart: fx };
  return null;
}

/** Points (from cleanPoints) within `months` of the last one. */
export function lastMonths(points, months) {
  if (!points?.length) return [];
  const from = monthsBefore(points[points.length - 1].t, months);
  return points.filter((p) => p.t >= from);
}

/* The last point of each calendar month (a daily series read monthly). */
function monthEnds(points) {
  const by = new Map();
  for (const p of points) by.set(String(p.x).slice(0, 7), p);
  return [...by.values()].sort((a, b) => a.t - b.t);
}

/**
 * Nov 7: the rolling 12-month change in the currency's dollar value, from a local-per-USD
 * series: (rate 12 months earlier / rate now - 1) x 100, so a fall in value is negative.
 * Monthly points (a daily series is read at month ends; the longer of the two is used).
 * -> [{ t, x, y }]
 */
export function rollingValueChange(fx, fxMonthly, months = 12) {
  const a = monthEnds(cleanPoints(fx));
  const b = monthEnds(cleanPoints(fxMonthly));
  const pts = b.length > a.length ? b : a;
  const byMonth = new Map(pts.map((p) => [String(p.x).slice(0, 7), p]));
  const out = [];
  for (const p of pts) {
    const d = new Date(p.t);
    const back = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1));
    const key = `${back.getUTCFullYear()}-${String(back.getUTCMonth() + 1).padStart(2, '0')}`;
    const old = byMonth.get(key);
    if (old && old.y > 0 && p.y > 0)
      out.push({ t: p.t, x: String(p.x).slice(0, 7), y: +((old.y / p.y - 1) * 100).toFixed(2) });
  }
  return out;
}

/**
 * Nov 7: policy rate minus annual inflation, month by month (the ex-post real rate), over
 * the months both series cover. The policy rate in force is its last value at or before the
 * inflation month. -> [{ t, x, y }]
 */
export function realRateSeries(policy, inflation) {
  const pol = cleanPoints(policy);
  const infl = cleanPoints(inflation);
  if (!pol.length || !infl.length) return [];
  const out = [];
  let j = -1;
  for (const p of infl) {
    const end = Date.UTC(new Date(p.t).getUTCFullYear(), new Date(p.t).getUTCMonth() + 1, 0);
    while (j + 1 < pol.length && pol[j + 1].t <= end) j += 1;
    if (j < 0) continue;
    out.push({ t: p.t, x: p.x, y: +(pol[j].y - p.y).toFixed(2) });
  }
  return out;
}

/** Median of a list of numbers (null when empty). */
export function medianOf(values) {
  const v = (values || []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Share of values at or below `v`, as a whole percentile (0 to 100). */
export function percentileRank(values, v) {
  const xs = (values || []).filter((x) => Number.isFinite(x));
  if (!xs.length || !Number.isFinite(v)) return null;
  return Math.round((xs.filter((x) => x <= v).length / xs.length) * 100);
}

/** The FX windows that would show at least two points, in display order. */
export function fxWindowsAvailable(fx, fxMonthly) {
  return FX_WINDOWS.filter((w) => fxWindow(fx, fxMonthly, w.months));
}

/** The window shown first: one year when available, else the longest available. */
export function defaultFxWindow(available) {
  if (!available?.length) return null;
  return (available.find((w) => w.id === '1Y') || available[available.length - 1]).id;
}

/** 3 to 5 "nice" ticks covering [min, max]; the domain grows to the outer ticks. */
export function axisTicks(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max))
    return { ticks: [0, 1], lo: 0, hi: 1, step: 1 };
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
    ticks.push(+(Math.round(t / step) * step).toFixed(10));
  return { ticks, lo, hi, step };
}

/** Decimals a tick step needs: 5 -> 0, 2.5 -> 1, 0.25 -> 2. */
export function stepDecimals(step) {
  return Math.min(3, (String(+Number(step).toFixed(6)).split('.')[1] || '').length);
}

/** A value as the card writes it: compact for large magnitudes, a real minus sign. */
export function fmtValue(v, { decimals = null, pct = false } = {}) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'n/a';
  const a = Math.abs(v);
  let s;
  if (a >= 1e12) s = `${(a / 1e12).toFixed(2)}T`;
  else if (a >= 1e9) s = `${(a / 1e9).toFixed(1)}B`;
  else if (a >= 1e6) s = `${(a / 1e6).toFixed(1)}M`;
  else if (a >= 10000) s = Math.round(a).toLocaleString('en-US');
  else if (decimals != null) s = a.toFixed(decimals);
  else s = a >= 100 ? a.toFixed(1) : a.toFixed(2);
  return `${v < 0 ? '−' : ''}${s}${pct ? '%' : ''}`;
}

/** True when the unit is a percentage. */
export const isPctUnit = (unit) => /%|percent/i.test(String(unit || ''));

/* ------------------------------------------------------------------ data not available */

const CDS = /sovereign cds/i;
const EXPECT = /inflation expectations/i;

/** The plain sentence under the missing list, or null. */
export function missingSentence(missing) {
  const list = missing || [];
  const cds = list.some((m) => CDS.test(m));
  const exp = list.some((m) => EXPECT.test(m));
  if (cds && exp)
    return "Sovereign CDS spreads and inflation expectations are not in Ezana's data.";
  if (cds) return "Sovereign CDS spreads are not in Ezana's data.";
  if (exp) return "Inflation expectations are not in Ezana's data.";
  return null;
}

/** First letter up, for list items written in sentence case. */
export const sentenceCase = (s) => {
  const t = String(s || '').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};

/** fallbackText -> paragraphs (blank-line separated). */
export const paragraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/* ------------------------------------------------------------------ transmission map */

/* Grid slots per node id: [column, row]. Wide reads left to right (causes, channels,
   depreciation, import prices); tall reads top to bottom for a phone-width card. */
const SLOTS = {
  wide: {
    inflation: [0, 0],
    easing: [0, 1],
    fx_demand: [1, 0],
    capital: [1, 1],
    depreciation: [2, 0.5],
    import_prices: [3, 0.5],
  },
  tall: {
    inflation: [0, 0],
    easing: [1, 0],
    fx_demand: [0, 1],
    capital: [1, 1],
    depreciation: [0.5, 2],
    import_prices: [0.5, 3],
  },
};

/** Greedy word wrap to `max` characters a line. */
export function wrapWords(text, max) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if (`${line} ${w}`.length <= max) line = `${line} ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/**
 * Node boxes and edge segments for the transmission map in pixel space, for a container
 * `width` px wide. Wide (4 columns) from 520 px, else tall (2 columns, 4 rows). Nodes the
 * slot table does not know take extra rows below; edges need both ends present.
 * Each node carries its status tag ("supported by data" | "conceptual"), wrapped like the label.
 * -> { width, height, mode, nodes: [{ id, label, supported, x, y, w, h, lines, tagLines }],
 *      edges: [{ from, to, x1, y1, x2, y2 }] }
 */
export const nodeStatus = (n) => (n?.supported ? 'supported by data' : 'conceptual');

export function transmissionLayout(
  map,
  width,
  { lineH = 14, tagH = 14, pad = 8, charW = 6.4, tagCharW = 6.8 } = {},
) {
  const nodes = (map?.nodes || []).filter((n) => n && n.id);
  if (!nodes.length || !(width > 0)) return null;
  const mode = width >= 520 ? 'wide' : 'tall';
  const cols = mode === 'wide' ? 4 : 2;
  const gapX = mode === 'wide' ? 28 : 18;
  const gapY = mode === 'wide' ? 16 : 26;
  const w = (width - gapX * (cols - 1)) / cols;
  const maxChars = Math.max(8, Math.floor((w - pad * 2) / charW));
  const maxTagChars = Math.max(6, Math.floor((w - pad * 2) / tagCharW));
  const slots = SLOTS[mode];
  let extraRow = mode === 'wide' ? 2 : 4;
  let extraCol = 0;
  const placed = nodes.map((n) => {
    let slot = slots[n.id];
    if (!slot) {
      slot = [extraCol, extraRow];
      extraCol += 1;
      if (extraCol >= cols) {
        extraCol = 0;
        extraRow += 1;
      }
    }
    const lines = wrapWords(n.label, maxChars);
    const tagLines = wrapWords(nodeStatus(n), maxTagChars);
    return {
      ...n,
      col: slot[0],
      row: slot[1],
      lines,
      tagLines,
      h: pad * 2 + lines.length * lineH + 4 + tagLines.length * tagH,
    };
  });
  /* One height for every box keeps the rows aligned and the arrows level. */
  const boxH = Math.max(...placed.map((n) => n.h));
  const rowStep = boxH + gapY;
  const out = placed.map((n) => ({
    id: n.id,
    label: n.label,
    supported: Boolean(n.supported),
    lines: n.lines,
    tagLines: n.tagLines,
    w,
    h: boxH,
    x: n.col * (w + gapX),
    y: n.row * rowStep,
  }));
  const byId = new Map(out.map((n) => [n.id, n]));
  const edges = [];
  for (const e of map?.edges || []) {
    const [from, to] = Array.isArray(e) ? e : [e?.from, e?.to];
    const a = byId.get(from);
    const b = byId.get(to);
    if (!a || !b) continue;
    const horizontal = mode === 'wide' ? b.x > a.x + a.w / 2 : Math.abs(b.y - a.y) < 1;
    if (horizontal) {
      edges.push({ from, to, x1: a.x + a.w, y1: a.y + a.h / 2, x2: b.x, y2: b.y + b.h / 2 });
    } else {
      edges.push({ from, to, x1: a.x + a.w / 2, y1: a.y + a.h, x2: b.x + b.w / 2, y2: b.y });
    }
  }
  const height = Math.max(...out.map((n) => n.y + n.h));
  return { width, height, mode, nodes: out, edges };
}

/* ------------------------------------------------------------------ Ezana thresholds */

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(/^-/, '−');
const ordinalOf = (n) => {
  const v = Math.round(n);
  const s = v % 100 >= 11 && v % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][v % 10] || 'th';
  return `${v}${s}`;
};

/**
 * This country's own reading for one assessment row, in words, from the evidence the
 * engine recorded (assessmentRows in intel-brief.js). Null when the row carries none.
 * Shown in the "How Ezana thresholds work" modal next to each cut-off.
 */
export function evidenceReading(row) {
  const e = row?.evidence;
  if (!e) return null;
  const parts = [];
  switch (row.id) {
    case 'depreciation':
      if (num(e.valueLostPct))
        parts.push(`${fmt1(e.valueLostPct)}% of dollar value lost over 12 months`);
      if (num(e.annualisedLast3mPct))
        parts.push(`last 3 months annualised ${fmt1(e.annualisedLast3mPct)}%`);
      break;
    case 'inflation':
      if (num(e.annualPct)) parts.push(`annual inflation ${fmt1(e.annualPct)}%`);
      if (e.trend) parts.push(`${e.trend} against a year earlier`);
      break;
    case 'policy':
      if (num(e.expostRealRatePp)) parts.push(`real policy rate ${fmt1(e.expostRealRatePp)} pp`);
      if (e.easingOverYear === true) parts.push('rate cut over the year');
      break;
    case 'external':
      if (num(e.reservesChange3mPct))
        parts.push(`reserves ${fmt1(e.reservesChange3mPct)}% over about 3 months`);
      if (num(e.reserveImportMonths))
        parts.push(`${fmt1(e.reserveImportMonths)} months of import cover`);
      if (num(e.currentAccountPctGdp))
        parts.push(`current account ${fmt1(e.currentAccountPctGdp)}% of GDP`);
      break;
    case 'stress':
      if (num(e.ownHistoryPercentile))
        parts.push(`${ordinalOf(e.ownHistoryPercentile)} percentile of its own history`);
      break;
    default:
      return null;
  }
  return parts.length ? sentenceCase(parts.join(', ')) : null;
}

/* ------------------------------------------------------------------ full-width detail */

/**
 * Pack the answer's detail sections into rows of a `cols`-column grid so every row is filled
 * edge to edge: no section ever sits alone in a column with empty space beside it.
 *
 * sections: [{ id, span, min? }] in reading order. `span` is the preferred width in columns,
 * `min` the narrowest it reads well at (defaults to span). A section that does not fit the
 * current row closes it; the row's sections then share the leftover columns (wider sections
 * first), so the last item never strands a gap. A section wider than `cols` takes a full row.
 * -> [{ id, span, row }]
 */
export function packDetailRows(sections, cols = 12) {
  const list = (sections || []).filter((s) => s && s.id);
  const out = [];
  let row = [];
  let used = 0;
  let rowNo = 0;
  const close = () => {
    if (!row.length) return;
    let spare = cols - used;
    /* Hand the spare columns out one at a time, widest section first, round robin. */
    const order = [...row].sort((a, b) => b.span - a.span);
    let k = 0;
    while (spare > 0) {
      order[k % order.length].span += 1;
      spare -= 1;
      k += 1;
    }
    for (const r of row) out.push({ id: r.id, span: r.span, row: rowNo });
    rowNo += 1;
    row = [];
    used = 0;
  };
  for (const s of list) {
    const span = Math.max(1, Math.min(cols, Math.round(s.span || cols)));
    const min = Math.max(1, Math.min(span, Math.round(s.min || span)));
    if (used + span <= cols) {
      row.push({ id: s.id, span });
      used += span;
    } else if (used + min <= cols) {
      row.push({ id: s.id, span: cols - used });
      used = cols;
    } else {
      close();
      row.push({ id: s.id, span });
      used = span;
    }
    if (used >= cols) close();
  }
  close();
  return out;
}
