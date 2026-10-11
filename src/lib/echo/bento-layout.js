/**
 * Ezana Echo home: front-page packing. Pure: stories in, tiles out. No React,
 * no DOM, no `@/` imports (tested by scripts/check-echo-home.mjs under plain
 * Node). The CSS sets column spans per breakpoint from the tile kind (and the
 * lead's `wide` flag); this module never knows the viewport.
 *
 * Newspaper-style front page (echo-home-redesign handoff, Oct 2026): a 12-col
 * grid at desktop where no photo renders wider than 640px.
 *
 * A story: { id, title, dek?, tag?, section, date, mins, image?, href }
 * A chart: { takeaway, sourceTitle, href, series: [{ points: number[], kind: 'main' | 'compare' }] }
 * A tile:  { key, kind, tone?, wide?, noImage?, slot, page, story?, chart? }
 *   kind: 'lead' | 'chart' | 'standard' | 'dark' | 'text'
 *
 * Rules:
 *  - Stories keep their order; the pattern decides size, not order.
 *  - The lead takes the first story that has an image; skipped stories keep
 *    their relative order after it. With no image on the page it is a text
 *    lead (noImage, tone 'lead'). The lead is `wide` (full row) when the page
 *    has no chart beside it.
 *  - A standard slot given a story with no image is flagged `noImage`; the UI
 *    draws the tinted no-image card, never an empty picture box.
 *  - The dark slot takes the next story with a dek, else the next story.
 *  - The text slot takes the next story as text, tone 'neutral'.
 *  - The chart slot exists only on page 1 and only when a chart is supplied.
 *  - Fewer stories than slots: render what exists, never empty tiles.
 */

export const PAGE_SIZE = 9;

export const PATTERN = [
  { slot: 1, kind: 'lead' },
  { slot: 2, kind: 'chart' },
  { slot: 3, kind: 'standard' },
  { slot: 4, kind: 'standard' },
  { slot: 5, kind: 'standard' },
  { slot: 6, kind: 'standard' },
  { slot: 7, kind: 'dark' },
  { slot: 8, kind: 'standard' },
  { slot: 9, kind: 'text', tone: 'neutral' },
  { slot: 10, kind: 'standard' },
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
  const withChart = page === 1 && Boolean(chart);
  const slots = PATTERN.filter((s) => s.kind !== 'chart' || withChart);
  const tiles = [];

  for (const slot of slots) {
    if (slot.kind === 'chart') {
      tiles.push({ key: `p${page}-chart`, kind: 'chart', slot: slot.slot, page, chart });
      continue;
    }
    if (queue.length === 0) break;

    const tile = { kind: slot.kind, slot: slot.slot, page };
    if (slot.tone) tile.tone = slot.tone;

    if (slot.kind === 'lead') {
      let story = takeFirst(queue, hasImage);
      if (!story) {
        story = queue.shift();
        tile.noImage = true;
        tile.tone = 'lead';
      }
      tile.story = story;
      if (!withChart) tile.wide = true;
    } else if (slot.kind === 'dark') {
      tile.story = takeFirst(queue, hasDek) || queue.shift();
    } else if (slot.kind === 'standard') {
      tile.story = queue.shift();
      if (!hasImage(tile.story)) tile.noImage = true;
    } else {
      tile.story = queue.shift();
    }

    tile.key = `p${page}-${tile.story.id}`;
    tiles.push(tile);
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
