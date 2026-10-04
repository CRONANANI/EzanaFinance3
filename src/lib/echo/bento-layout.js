/**
 * Ezana Echo home: bento packing. Pure: stories in, tiles out. No React, no DOM,
 * no `@/` imports (tested by scripts/check-echo-home.mjs under plain Node).
 * Ported unchanged in behaviour from the design handoff (option B, Magazine
 * bento). The CSS sets spans per breakpoint from the tile kind; this module
 * never knows the viewport.
 *
 * A story: { id, title, dek?, tag?, section, date, mins, image?, href }
 * A chart: { takeaway, sourceTitle, href, series: [{ points: number[], kind: 'main' | 'compare' }] }
 * A tile:  { key, kind, tone?, cols, rows, slot, page, story?, chart? }
 *
 * Rules:
 *  - Stories keep their order; the pattern decides size, not order.
 *  - The feature slot takes the first story that has an image; skipped
 *    stories keep their relative order after it. With no image on the page
 *    it becomes a text tile, tone 'lead', at the feature's full size.
 *  - An image slot given a story with no image becomes a neutral text tile.
 *  - Text slots take the story as text.
 *  - The dark slot takes the next story with a dek, else the next story.
 *  - The chart slot exists only on page 1 and only when a chart is supplied.
 *  - Fewer stories than slots: render what exists, never empty tiles.
 */

export const PAGE_SIZE = 10;

export const PATTERN = [
  { slot: 1, kind: 'feature', cols: 2, rows: 3 },
  { slot: 2, kind: 'image', cols: 1, rows: 2 },
  { slot: 3, kind: 'text', tone: 'tint', cols: 1, rows: 2 },
  { slot: 4, kind: 'chart', cols: 2, rows: 1 },
  { slot: 5, kind: 'image', cols: 1, rows: 2 },
  { slot: 6, kind: 'image', cols: 1, rows: 2 },
  { slot: 7, kind: 'image', cols: 1, rows: 2 },
  { slot: 8, kind: 'text', tone: 'neutral', cols: 1, rows: 2 },
  { slot: 9, kind: 'dark', cols: 2, rows: 2 },
  { slot: 10, kind: 'image', cols: 1, rows: 2 },
  { slot: 11, kind: 'image', cols: 1, rows: 2 },
];

const hasImage = (s) => Boolean(s && s.image);
const hasDek = (s) => Boolean(s && s.dek && s.dek.trim());

function takeFirst(queue, predicate) {
  const i = queue.findIndex(predicate);
  if (i === -1) return null;
  return queue.splice(i, 1)[0];
}

/**
 * Pack one page of stories into tiles.
 * @param {Array} stories  the stories for this page, in order (up to PAGE_SIZE)
 * @param {{ page?: number, chart?: object|null }} opts
 * @returns {Array} tiles in DOM order
 */
export function packPage(stories, { page = 1, chart = null } = {}) {
  const queue = Array.isArray(stories) ? stories.slice() : [];
  const slots = PATTERN.filter((s) => s.kind !== 'chart' || (page === 1 && chart));
  const tiles = [];

  for (const slot of slots) {
    if (slot.kind === 'chart') {
      tiles.push({
        key: `p${page}-chart`,
        kind: 'chart',
        cols: slot.cols,
        rows: slot.rows,
        slot: slot.slot,
        page,
        chart,
      });
      continue;
    }
    if (queue.length === 0) break;

    let story;
    let kind = slot.kind;
    let tone = slot.tone;

    if (slot.kind === 'feature') {
      story = takeFirst(queue, hasImage);
      if (!story) {
        // No story on this page has an image: the slot keeps its 2 x 3 size
        // as a large text "lead" tile. A 1 x 2 fallback here would leave
        // holes the rest of the pattern cannot fill.
        story = queue.shift();
        kind = 'text';
        tone = 'lead';
      }
    } else if (slot.kind === 'dark') {
      story = takeFirst(queue, hasDek) || queue.shift();
    } else if (slot.kind === 'image') {
      story = queue.shift();
      if (!hasImage(story)) {
        kind = 'text';
        tone = 'neutral';
      }
    } else {
      story = queue.shift();
    }

    tiles.push({
      key: `p${page}-${story.id}`,
      kind,
      tone,
      cols: slot.cols,
      rows: slot.rows,
      slot: slot.slot,
      page,
      story,
    });
  }
  return tiles;
}

/**
 * Pack every loaded story: splits into pages of PAGE_SIZE and packs each.
 * @param {Array} stories  all loaded stories, in order
 * @param {{ chart?: object|null }} opts
 */
export function packTiles(stories, { chart = null } = {}) {
  const list = Array.isArray(stories) ? stories : [];
  const tiles = [];
  for (let i = 0, page = 1; i < list.length; i += PAGE_SIZE, page += 1) {
    tiles.push(...packPage(list.slice(i, i + PAGE_SIZE), { page, chart }));
  }
  return tiles;
}
