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
