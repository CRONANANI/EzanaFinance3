/**
 * Dot map (Nov 2026): pure helpers for the research board's dotted world map (the Top 5
 * snapshot of a country ranking). The land grid is src/lib/sonar/world-dots.js (Natural
 * Earth, 2.5 degree cells, every country tagged by ISO3). No I/O, no React; tested in
 * scripts/check-sonar-board-polish.mjs.
 *
 * Geometry is in grid units: x = column + 0.5, y = row + 0.5, on a WORLD_COLS x WORLD_ROWS
 * viewBox. Each set of dots is one SVG path of zero-length segments ("M x y h0"), drawn with
 * a round line cap, so a few thousand dots cost one element.
 */
import {
  WORLD_COLS,
  WORLD_ROWS,
  WORLD_ISO3,
  WORLD_ANCHORS,
  WORLD_ROWS_RLE,
  WORLD_NAMES,
} from './world-dots.js';

export { WORLD_COLS, WORLD_ROWS };

let decoded = null;

/** The land dots, decoded once: [{ x, y, iso3 }] plus each country's label anchor. */
export function worldDots() {
  if (decoded) return decoded;
  const dots = [];
  WORLD_ROWS_RLE.forEach((row, r) => {
    if (!row) return;
    for (const tok of row.split(' ')) {
      const [s, n, k] = tok.split('.').map((v) => parseInt(v, 36));
      for (let c = s; c < s + n; c += 1) dots.push({ x: c + 0.5, y: r + 0.5, iso3: WORLD_ISO3[k] });
    }
  });
  const anchors = new Map(
    WORLD_ISO3.map((iso3, i) => {
      const [c, r] = WORLD_ANCHORS[i].split('.').map((v) => parseInt(v, 36));
      return [iso3, { x: c + 0.5, y: r + 0.5 }];
    }),
  );
  decoded = { dots, anchors };
  return decoded;
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** A country name (as a publisher writes it) or an ISO3 code -> ISO3, or null. */
export function isoOf(nameOrCode) {
  const raw = String(nameOrCode || '').trim();
  if (/^[A-Z]{3}$/.test(raw) && WORLD_ISO3.includes(raw)) return raw;
  return WORLD_NAMES[norm(raw)] || null;
}

/**
 * The ranking's rows placed on the map: the row's own iso3 when the engine sent one, else
 * its label matched to a country. A ranking of companies or members matches nothing, and the
 * board keeps its bar snapshot.
 * -> { rows: [{ ...row, rank, iso3 }], placed: number, isCountries: boolean }
 */
export function placeRanking(rows) {
  const out = (rows || []).map((r, i) => {
    const iso3 = (r.iso3 && isoOf(r.iso3)) || isoOf(r.label);
    return { ...r, rank: r.rank || i + 1, iso3: iso3 || null };
  });
  const placed = out.filter((r) => r.iso3 && worldDots().anchors.has(r.iso3)).length;
  /* A country map only when most of the rows are countries we can draw. */
  return {
    rows: out,
    placed,
    isCountries: out.length >= 2 && placed >= Math.ceil(out.length * 0.6),
  };
}

const seg = (d) => `M${d.x} ${d.y}h0`;

/**
 * The map's paths and markers for a set of ranked countries.
 * -> { base: path, ranked: [{ rank, iso3, d }], markers: [{ rank, iso3, x, y, ax, ay, moved }] }
 * Markers start on the country's anchor; one that would sit on an earlier marker is nudged
 * up or down (ax, ay keep the anchor, for a short leader line).
 */
export function dotMapGeometry(rows, { minGap = 7 } = {}) {
  const { dots, anchors } = worldDots();
  const rankOf = new Map();
  for (const r of rows || []) if (r.iso3 && !rankOf.has(r.iso3)) rankOf.set(r.iso3, r.rank);
  const base = [];
  const byRank = new Map();
  for (const d of dots) {
    const rank = rankOf.get(d.iso3);
    if (rank == null) base.push(seg(d));
    else {
      if (!byRank.has(rank)) byRank.set(rank, { rank, iso3: d.iso3, parts: [] });
      byRank.get(rank).parts.push(seg(d));
    }
  }
  const ranked = [...byRank.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((g) => ({ rank: g.rank, iso3: g.iso3, d: g.parts.join('') }));

  const placed = [];
  const markers = [];
  for (const r of [...(rows || [])].sort((a, b) => a.rank - b.rank)) {
    const a = r.iso3 ? anchors.get(r.iso3) : null;
    if (!a) continue;
    let { x, y } = a;
    const clash = (px, py) =>
      placed.some((p) => Math.abs(p.x - px) < minGap && Math.abs(p.y - py) < minGap * 0.62);
    if (clash(x, y)) {
      const tries = [-1, 1, -2, 2, -3, 3].map((k) => ({ x: a.x, y: a.y + k * minGap * 0.66 }));
      const ok = tries.find((t) => t.y > 2 && t.y < WORLD_ROWS - 2 && !clash(t.x, t.y));
      if (ok) ({ x, y } = ok);
    }
    const m = {
      rank: r.rank,
      iso3: r.iso3,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      ax: a.x,
      ay: a.y,
    };
    m.moved = m.x !== a.x || m.y !== a.y;
    placed.push(m);
    markers.push(m);
  }
  return { base: base.join(''), ranked, markers };
}
