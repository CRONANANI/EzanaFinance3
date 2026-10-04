/**
 * Ezana Echo home: the Chart of the Week tile.
 *
 * Editorial pick, one line to change: name a published article, the figure to
 * draw (its FIG. label prefix) and the takeaway sentence. The series are read
 * from that figure in the article's own content_blocks, so the tile always
 * draws the numbers the story publishes. If the article is unpublished or
 * archived, or the figure is missing or not a line/series figure, the tile is
 * omitted and the bento packs without it.
 *
 * Pure (no `@/` imports): tested by scripts/check-echo-home.mjs.
 */

export const CHART_OF_THE_WEEK = {
  slug: 'sovereign-wealth-league-table-2026',
  figure: 'FIG. 2',
  takeaway: 'Norway’s sovereign fund tripled in a decade, to NOK 22,683bn by June 2026',
};

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Series from a figure block. Supports `trajectory` (series[].data[{x,y}]) and
 * `multi-axis` (series[].values). At most two series; the first is the main
 * line, the second the dashed comparison. Multi-axis series sit on their own
 * scales in the article, so they are flagged `independent` and the tile scales
 * each to its own range.
 */
export function chartFromFigure(block) {
  if (!block || !Array.isArray(block.series)) return null;
  let series = [];
  let independent = false;
  if (block.type === 'trajectory') {
    series = block.series.map((s) => ({
      label: s.label || '',
      points: (Array.isArray(s.data) ? s.data : [])
        .filter((p) => p && finite(p.x) && finite(p.y))
        .sort((a, b) => a.x - b.x)
        .map((p) => p.y),
    }));
  } else if (block.type === 'multi-axis') {
    independent = true;
    series = block.series.map((s) => ({
      label: s.label || '',
      points: (Array.isArray(s.values) ? s.values : []).filter(finite),
    }));
  } else {
    return null;
  }
  series = series.filter((s) => s.points.length >= 2).slice(0, 2);
  if (!series.length) return null;
  return {
    independent: independent && series.length > 1,
    series: series.map((s, i) => ({ ...s, kind: i === 0 ? 'main' : 'compare' })),
  };
}

/** Config + the article ({ slug, title, contentBlocks }) -> the tile's chart, or null. */
export function buildChartOfTheWeek(config, article) {
  if (!config?.slug || !article || article.slug !== config.slug) return null;
  const blocks = Array.isArray(article.contentBlocks) ? article.contentBlocks : [];
  const prefix = String(config.figure || '').trim();
  const block = blocks.find(
    (b) => b && typeof b.figureLabel === 'string' && prefix && b.figureLabel.startsWith(prefix),
  );
  const drawn = chartFromFigure(block);
  if (!drawn || !config.takeaway) return null;
  return {
    slug: article.slug,
    takeaway: config.takeaway,
    sourceTitle: article.title || '',
    href: `/ezana-echo/${article.slug}`,
    ...drawn,
  };
}
