/**
 * The Empire Rankings leg of a country ping (Sonar), as a pure function of
 * the empire model (oecd-empire-model.js), so the page, Sonar and the OECD
 * explorer score identically and this can be unit tested without a network.
 *
 * `top` is the three dimensions the country ranks HIGHEST in (best rank, ties
 * by score, then display order), each with a compact distribution of every
 * country's score on that dimension, so the card can draw where the country
 * sits without a second request, and a deep link to that dimension's table.
 */
import {
  empireComposite,
  empireRankWithin,
  normScore,
} from '@/app/datasets/oecd-macro/oecd-empire-model';

export const EMPIRE_PAGE = '/datasets/global-empire-lighthouse';

const round1 = (n) => Math.round(n * 1000) / 10;

/** @returns {object|null} null when the country has no live score. */
export function empireDossier(model, country) {
  if (!model || !model.scoreMap?.has(country.iso3)) return null;

  const composite = empireComposite(model, model.liveDims);
  const at = composite.findIndex((c) => c.iso === country.iso3);
  const me = at >= 0 ? composite[at] : null;

  const dims = model.liveDims
    .map((d, order) => {
      const n = normScore(d, model.scoreMap.get(country.iso3)?.get(d.id));
      if (n == null) return null;
      const r = empireRankWithin(model, d, country.iso3);
      return {
        id: d.id,
        name: d.name,
        category: d.category || null,
        score: round1(n),
        rank: r?.rank ?? null,
        of: r?.n ?? null,
        order,
      };
    })
    .filter(Boolean);
  if (!dims.length) return null;

  const byStrength = [...dims].sort((a, b) => b.score - a.score);

  /* The categories the country ranks highest in: best rank first, ties by
     score, then by the dimension's display order. Only ranked dimensions. */
  const top = dims
    .filter((d) => d.rank != null)
    .sort((a, b) => a.rank - b.rank || b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map((d) => {
      const dimDef = model.liveDims.find((x) => x.id === d.id);
      const dist = [];
      for (const [, m] of model.scoreMap) {
        const n = normScore(dimDef, m.get(d.id));
        if (n != null) dist.push(round1(n));
      }
      dist.sort((a, b) => b - a);
      return {
        ...d,
        dist,
        href: `${EMPIRE_PAGE}?dim=${encodeURIComponent(d.id)}&country=${encodeURIComponent(country.iso3)}#dim-${d.id}`,
      };
    });

  /* The top three by composite, with their pillar scores on the same 0-100
     scale, for the country_rank pillar comparison. */
  const leaders = composite.slice(0, 3).map((c, i) => ({
    iso: c.iso,
    name: c.name,
    rank: i + 1,
    dims: Object.fromEntries(
      model.liveDims
        .map((d) => [d.id, normScore(d, model.scoreMap.get(c.iso)?.get(d.id))])
        .filter(([, n]) => n != null)
        .map(([id, n]) => [id, round1(n)]),
    ),
  }));

  const strip = ({ order: _order, ...d }) => d;
  return {
    year: model.year,
    leaders,
    href: `${EMPIRE_PAGE}?country=${encodeURIComponent(country.iso3)}`,
    rank: me ? at + 1 : null,
    of: composite.length,
    composite: me ? Math.round(me.composite * 10) / 10 : null,
    coverage: { present: dims.length, total: model.liveDims.length },
    strongest: byStrength.slice(0, 3).map((d) => d.name),
    weakest: byStrength
      .slice(-3)
      .reverse()
      .map((d) => d.name),
    dims: byStrength.map(strip),
    top: top.map(strip),
    source: 'Ezana Global Empire Rankings',
  };
}
