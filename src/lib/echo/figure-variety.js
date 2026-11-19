/**
 * Echo figure variety (Nov 19, 2026).
 *
 * Articles were reading alike: the same chart types, in the same slots. This
 * re-draws some figures in a different chart form, chosen per article, so no
 * two articles show the same sequence of visuals. Rules:
 *
 *   - Only lossless swaps. A figure changes form only when the new chart can
 *     show every number the old one did:
 *       trajectory                       -> glow-line (annotations kept)
 *       multi-axis (one unit, ordered x) -> glow-line
 *       radial-stack (3+ arcs, <= 4 segment labels) -> radar
 *       variable-pie                     -> donut (magnitude kept per slice)
 *       dossier-table (one numeric unit) -> dossier-bars (every cell kept)
 *   - Same figure count, same place in the story: a figure keeps its slot,
 *     label, kicker and source, so the paragraphs that discuss it still sit
 *     beside it and FIG numbering holds.
 *   - Deterministic: the choice is a hash of the article slug and the
 *     figure's position, so a page renders the same on server and client and
 *     on every visit (no Math.random).
 *   - Every article with at least one swappable figure gets at least one new
 *     form; about half of the swappable figures change.
 *   - Frozen articles are never touched.
 *
 * New articles should simply pick varied types up front (see the Echo skills
 * guide, "Chart variety"); this keeps the back catalogue from looking cloned.
 */

const FROZEN = new Set(['peter-thiel-worldview-2026']);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ORDINAL_X =
  /^(q[1-4]|h[12]|fy|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{2,4}|'\d{2})/i;

function toGlowFromTrajectory(b) {
  if (!Array.isArray(b.series) || !b.series.length) return null;
  const tickLabel = new Map((b.xTicks || []).map((t) => [t.x, t.label]));
  return {
    ...b,
    type: 'glow-line',
    series: b.series.map((s) => ({ ...s, data: s.data || [] })),
    xFormat: tickLabel.size ? (x) => tickLabel.get(x) ?? x : undefined,
  };
}

function toGlowFromMultiAxis(b) {
  const cats = b.categories || [];
  const series = (b.series || []).slice(0, 3);
  if (cats.length < 3 || !series.length) return null;
  const units = new Set(series.map((s) => s.unit || ''));
  if (units.size !== 1) return null;
  if (!cats.every((c) => ORDINAL_X.test(String(c).trim()))) return null;
  return {
    ...b,
    type: 'glow-line',
    categories: cats,
    unit: [...units][0],
    series: series.map((s) => ({ label: s.label, values: s.values, dash: s.dash })),
  };
}

function toRadarFromRadial(b) {
  const cats = (b.categories || []).filter((c) => c && Array.isArray(c.segments));
  if (cats.length < 3) return null;
  const labels = [...new Set(cats.flatMap((c) => c.segments.map((s) => String(s.label))))];
  if (!labels.length || labels.length > 4) return null;
  return {
    figureLabel: b.figureLabel,
    kicker: b.kicker,
    hint: 'Each axis is one category; each outline is one segment. Hover a name to isolate it.',
    source: b.source,
    type: 'radar',
    axes: cats.map((c) => c.label),
    series: labels.map((l) => ({
      label: l,
      values: cats.map((c) => {
        const hit = c.segments.find((s) => String(s.label) === l);
        return hit ? Number(hit.value) || 0 : 0;
      }),
    })),
    variant: labels.length > 2 ? 'lines' : 'filled',
  };
}

function toDonutFromVariablePie(b) {
  const slices = (b.slices || []).filter((s) => s && Number(s.y) > 0);
  if (slices.length < 2) return null;
  return {
    figureLabel: b.figureLabel,
    kicker: b.kicker,
    hint: 'Hover a slice or a name: the middle shows its share and, below it, its magnitude.',
    source: b.source,
    type: 'donut',
    totalLabel: b.yLabel || 'Total',
    slices: slices.map((s) => ({
      label: s.label,
      value: s.y,
      detail: Number.isFinite(s.z) ? `${b.zLabel || 'magnitude'} ${s.z}` : undefined,
    })),
  };
}

/* A dossier table whose anchor metrics are all one kind of number (same
   prefix and unit, e.g. "83%" or "$4.2T") reads as ranked bars. */
const ANCHOR = /^\s*([^\d\s-]*)\s*(-?\d[\d,]*(?:\.\d+)?)\s*([A-Za-z%]{0,3})\s*$/;
function toBarsFromDossier(b) {
  const rows = b.rows || [];
  if (rows.length < 3) return null;
  const parsed = rows.map((r) => ANCHOR.exec(String(r.anchor ?? '')));
  if (parsed.some((m) => !m)) return null;
  const pre = new Set(parsed.map((m) => m[1]));
  const suf = new Set(parsed.map((m) => m[3]));
  if (pre.size !== 1 || suf.size !== 1) return null;
  return {
    ...b,
    type: 'dossier-bars',
    hint: b.hint,
    rows: rows.map((r, i) => ({ ...r, anchorValue: Number(parsed[i][2].replace(/,/g, '')) })),
  };
}

const SWAPS = {
  'dossier-table': toBarsFromDossier,
  trajectory: toGlowFromTrajectory,
  'multi-axis': toGlowFromMultiAxis,
  'radial-stack': toRadarFromRadial,
  'variable-pie': toDonutFromVariablePie,
};

export function varyFigures(blocks, slug) {
  if (!Array.isArray(blocks) || !slug || FROZEN.has(slug)) return blocks;
  const candidates = [];
  blocks.forEach((b, i) => {
    const fn = b && SWAPS[b.type];
    if (!fn) return;
    const alt = fn(b);
    if (alt) candidates.push({ i, alt });
  });
  if (!candidates.length) return blocks;
  const chosen = new Set(
    candidates.filter(({ i }) => hash(`${slug}:${i}`) % 2 === 0).map(({ i }) => i),
  );
  if (!chosen.size) {
    chosen.add(candidates[hash(slug) % candidates.length].i);
  }
  const altAt = new Map(candidates.map(({ i, alt }) => [i, alt]));
  return blocks.map((b, i) => (chosen.has(i) ? altAt.get(i) : b));
}

/* ── Enrichment (Nov 19, 2026) ─────────────────────────────────────────
   Adds up to two NEW figures per article, built only from data the
   article already carries, each placed beside the figure or section it
   comes from. Nothing is invented: every number is a sum, share, count or
   the article's own series.

     headline series (globeRail.metric, 4+ points)  -> glow-line, after the
        stat grid's opening paragraph; only when both ends are dates (a
        ranked list is not a line) and that exact series is not already
        charted in the article
     adjudication matrix                            -> glowing radar of how
        strongly each dimension held (3+ columns), or a sentiment bar of all
        its grades; alternated by slug so both appear across Echo
     market treemap                                 -> ridgeline of each
        group's moves (4+ leaves per group, 2+ groups), else a donut of
        each group's share
     clearing sankey (every flow valued)            -> donut of each
        source's share of the total

   Labels: an added figure takes the number of the figure it sits beside
   plus a letter (FIG. 3B), so published FIG numbers never change. Total
   figures stay within the guide's eight. */

const FIG_TYPES_SKIP = new Set([
  'paragraph',
  'heading',
  'callout',
  'quote',
  'cta-callout',
  'image',
  'continuing',
  'handover',
  'transformed',
  'stat-grid',
]);
const isFigure = (b) => b && !FIG_TYPES_SKIP.has(b.type);
const figNo = (b) => {
  const m = /FIG\.\s*(\d+)/i.exec(b?.figureLabel || '');
  return m ? Number(m[1]) : null;
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const legendText = (legend, key, fallback) => {
  const raw = legend?.[key];
  if (!raw) return fallback;
  const after = String(raw).split(':').slice(1).join(':').trim();
  return cap(after || raw);
};

function railGlow(article, blocks) {
  const m = article?.globeRail?.metric;
  const data = Array.isArray(m?.data) ? m.data.filter((p) => Number.isFinite(p?.y)) : [];
  if (data.length < 4) return null;
  /* Only a series over time reads as a line; a ranked list (Lockheed to
     Comcast) does not. Both ends must read as dates. */
  const TIME =
    /^(?:\d{1,2}\s+)?(?:Q[1-4]\s+)?(?:(?:early|mid|late)[- ]?)?(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:\d{4}(?:[–-]\d{2,4})?E?)?$/i;
  const isTime = (lab) => {
    const t = String(lab || '').split('·')[0].trim();
    return Boolean(t) && /\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(t) && TIME.test(t);
  };
  if (!isTime(m.startLabel) || !isTime(m.endLabel)) return null;
  /* Skip when the same series is already charted in the article. */
  const ys = data.map((p) => p.y);
  const same = (vals) =>
    Array.isArray(vals) &&
    vals.length === ys.length &&
    vals.every((v, k) => Math.abs(Number(v) - ys[k]) < 1e-9);
  const lists = [];
  blocks.forEach((b) => {
    (b?.series || []).forEach((sr) => {
      if (Array.isArray(sr?.data)) lists.push(sr.data.map((p) => (typeof p === 'object' ? p.y : p)));
      if (Array.isArray(sr?.values)) lists.push(sr.values);
    });
  });
  if (lists.some(same)) return null;
  const first = data[0].x;
  const last = data[data.length - 1].x;
  const end = (label) => String(label || '').split('·')[0].trim();
  const statAt = blocks.findIndex((b) => b?.type === 'stat-grid');
  let at = statAt >= 0 ? statAt + 1 : 1;
  if (blocks[at]?.type === 'paragraph') at += 1;
  const next = blocks.slice(at).find((b) => isFigure(b) && figNo(b) != null);
  const n = next ? figNo(next) : 1;
  return {
    at,
    block: {
      type: 'glow-line',
      figureLabel: `FIG. ${n}A · THE HEADLINE SERIES`,
      kicker: `${m.title}${m.startLabel && m.endLabel ? ` · ${m.startLabel} TO ${m.endLabel}` : ''}`.toUpperCase(),
      hint: 'The series the article is built on, first reading to latest. Hover for each point.',
      source: m.note ? `As compiled for this article: ${m.note}` : 'As compiled for this article.',
      series: [{ key: 'h', label: m.title, data }],
      xFormat: (x) => (x === first ? end(m.startLabel) : x === last ? end(m.endLabel) : ''),
    },
  };
}

function fromMatrix(b, i, slug) {
  const rows = (b.rows || []).filter((r) => Array.isArray(r.cells));
  const cols = b.cols || [];
  if (!rows.length || !cols.length) return null;
  const n = figNo(b);
  const label = n != null ? `FIG. ${n}B` : 'FIG.';
  const useRadar = cols.length >= 3 && hash(`${slug}:m${i}`) % 2 === 0;
  if (useRadar) {
    const scores = cols.map((_, c) => {
      let s = 0;
      rows.forEach((r) => {
        const v = r.cells[c]?.value;
        s += v === 'same' ? 1 : v === 'part' ? 0.5 : 0;
      });
      return Math.round((s / rows.length) * 100);
    });
    return {
      at: i + 1,
      block: {
        type: 'radar',
        figureLabel: `${label} · WHERE IT HELD MOST`,
        kicker: `EACH DIMENSION OF FIG. ${n ?? ''} SCORED ACROSS ITS ${rows.length} ROWS · FULL = 1, PARTIAL = ½, NONE = 0 · AS % OF ROWS`.replace('FIG.  ', 'FIG. '),
        hint: 'The further out a point, the more consistently that dimension held.',
        source: `Derived from ${label.replace('B', '')}: the same grades, counted per column.`,
        axes: cols,
        series: [{ label: legendText(b.legend, 'same', 'Held'), values: scores }],
        unit: '%',
        max: 100,
        variant: 'lines',
        glow: true,
      },
    };
  }
  const tally = { same: 0, part: 0, none: 0 };
  rows.forEach((r) =>
    r.cells.forEach((c) => {
      if (c?.value in tally) tally[c.value] += 1;
    }),
  );
  const total = tally.same + tally.part + tally.none;
  if (!total) return null;
  const parts = [
    { label: legendText(b.legend, 'same', 'Held'), value: tally.same, tone: 'pos' },
    { label: legendText(b.legend, 'part', 'Partial'), value: tally.part, tone: 'neu' },
    { label: legendText(b.legend, 'none', 'Did not hold'), value: tally.none, tone: 'neg' },
  ];
  const top = [...parts].sort((a, z) => z.value - a.value)[0];
  return {
    at: i + 1,
    block: {
      type: 'sentiment-bar',
      figureLabel: `${label} · THE TALLY`,
      kicker: `ALL ${total} GRADES IN FIG. ${n ?? ''}, COUNTED`,
      hint: 'Share of every cell in the matrix above, by grade.',
      source: `Derived from FIG. ${n ?? ''}: a count of its cells.`,
      title: `Across ${rows.length} rows and ${cols.length} columns`,
      overall: { label: `Mostly: ${top.label.toLowerCase()}`, tone: top.tone },
      parts,
      unit: ' cells',
    },
  };
}

function fromTreemap(b, i) {
  const groups = (b.groups || []).filter((g) => Array.isArray(g.leaves) && g.leaves.length);
  if (groups.length < 2) return null;
  const n = figNo(b);
  const label = n != null ? `FIG. ${n}B` : 'FIG.';
  const rich = groups.filter(
    (g) => g.leaves.length >= 4 && g.leaves.every((l) => Number.isFinite(l.perf)),
  );
  if (rich.length >= 2) {
    return {
      at: i + 1,
      block: {
        type: 'ridgeline',
        figureLabel: `${label} · HOW EACH GROUP MOVED`,
        kicker: `DISTRIBUTION OF THE MOVES (%) INSIDE EACH GROUP OF FIG. ${n ?? ''} · ONE ROW PER GROUP`,
        hint: 'A wide ridge is a group whose names moved apart; a tall narrow one moved together.',
        source: `Derived from FIG. ${n ?? ''}: the same leaves, grouped.`,
        series: rich.map((g) => ({
          id: g.label,
          label: g.label,
          values: g.leaves.map((l) => l.perf),
        })),
        unit: '%',
      },
    };
  }
  const slices = groups
    .map((g) => ({ label: g.label, value: g.leaves.reduce((a, l) => a + (Number(l.size) || 0), 0) }))
    .filter((s) => s.value > 0);
  if (slices.length < 2) return null;
  return {
    at: i + 1,
    block: {
      type: 'donut',
      figureLabel: `${label} · WHO HOLDS THE MOST`,
      kicker: `EACH GROUP'S SHARE OF THE TOTAL IN FIG. ${n ?? ''} · SUM OF ITS LEAVES, SAME UNITS`,
      hint: 'Hover a slice for its total and share.',
      source: `Derived from FIG. ${n ?? ''}: leaf values summed per group.`,
      slices,
    },
  };
}

function fromSankey(b, i) {
  const flows = b.flows || [];
  if (flows.length < 3 || flows.some((f) => !Number.isFinite(f.value))) return null;
  const names = new Map();
  (b.sourceGroups || []).forEach((g) =>
    (g.nodes || []).forEach((nd) => names.set(nd.id ?? nd.name, nd.name)),
  );
  const by = new Map();
  flows.forEach((f) => by.set(f.from, (by.get(f.from) || 0) + f.value));
  const slices = [...by.entries()]
    .map(([k, v]) => ({ label: names.get(k) || String(k), value: v }))
    .sort((a, z) => z.value - a.value);
  const top = slices.slice(0, 6);
  const rest = slices.slice(6).reduce((a, s) => a + s.value, 0);
  if (rest > 0) top.push({ label: 'All others', value: rest });
  if (top.length < 2) return null;
  const n = figNo(b);
  const label = n != null ? `FIG. ${n}B` : 'FIG.';
  return {
    at: i + 1,
    block: {
      type: 'donut',
      figureLabel: `${label} · THE SHARE OF THE TOTAL`,
      kicker: `EACH SOURCE'S SHARE OF ALL FLOWS IN FIG. ${n ?? ''} · SAME UNITS`,
      hint: 'Hover a slice: the middle shows its total and share.',
      source: `Derived from FIG. ${n ?? ''}: flow values summed per source.`,
      slices: top,
    },
  };
}

export function enrichFigures(blocks, article) {
  const slug = article?.slug || article?.id;
  if (!Array.isArray(blocks) || !slug || FROZEN.has(slug)) return blocks;
  const figCount = blocks.filter(isFigure).length;
  const room = Math.max(0, Math.min(2, 8 - figCount));
  if (!room) return blocks;
  const adds = [];
  const glow = railGlow(article, blocks);
  if (glow) adds.push(glow);
  blocks.forEach((b, i) => {
    if (b?.type === 'adjudication-matrix') {
      const x = fromMatrix(b, i, slug);
      if (x) adds.push(x);
    } else if (b?.type === 'market-treemap') {
      const x = fromTreemap(b, i);
      if (x) adds.push(x);
    } else if (b?.type === 'clearing-sankey') {
      const x = fromSankey(b, i);
      if (x) adds.push(x);
    }
  });
  if (!adds.length) return blocks;
  /* Prefer a mix: one figure from a different source type before a second
     of the same kind, then keep story order. */
  const picked = [];
  const seen = new Set();
  for (const a of adds) {
    if (picked.length >= room) break;
    if (!seen.has(a.block.type)) {
      picked.push(a);
      seen.add(a.block.type);
    }
  }
  for (const a of adds) {
    if (picked.length >= room) break;
    if (!picked.includes(a)) picked.push(a);
  }
  const out = [...blocks];
  picked
    .sort((a, z) => z.at - a.at)
    .forEach(({ at, block }) => out.splice(at, 0, { ...block, derived: true }));
  return out;
}
