/**
 * The hub canvas layout model. Pure functions, no React and no DOM, so the
 * rules (what a guest may place, how a stored layout is repaired) are tested
 * on their own and the component stays about interaction.
 *
 * A layout is an ordered list of placed cards: [{ id, w, h }]
 *   id  a card id from the hub's registry
 *   w   column span on a 12-column grid, clamped to the card's [minW, 12]
 *   h   explicit height in px once the visitor has resized it, else null
 *       (null means the card takes its natural height)
 */

export const COLS = 12;
/* Signed-out visitors may keep this many cards on a hub at once. */
export const GUEST_LIMIT = 3;
export const MIN_H = 180;
export const MAX_H = 1600;
const VERSION = 1;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** The cards a visitor in `mode` may place: every card, or the guest set. */
export function placeableIds(cards, mode) {
  return cards.filter((c) => mode === 'member' || c.guest).map((c) => c.id);
}

/** The out-of-the-box layout for a mode. Members get every card in registry
 *  order; guests get the guest set, capped at GUEST_LIMIT. */
export function defaultLayout(cards, mode) {
  const list = mode === 'member' ? cards : cards.filter((c) => c.guest).slice(0, GUEST_LIMIT);
  return list.map((c) => ({ id: c.id, w: clamp(c.w || COLS, c.minW || 4, COLS), h: null }));
}

/**
 * Repair a stored layout against the current registry and mode. Drops ids
 * that no longer exist or are not placeable, de-duplicates, clamps sizes, and
 * enforces the guest cap. Anything unreadable falls back to the default.
 */
export function sanitizeLayout(raw, cards, mode) {
  if (!Array.isArray(raw)) return defaultLayout(cards, mode);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const allowed = new Set(placeableIds(cards, mode));
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const card = item && byId.get(item.id);
    if (!card || !allowed.has(card.id) || seen.has(card.id)) continue;
    seen.add(card.id);
    const w = Number.isFinite(item.w) ? Math.round(item.w) : card.w || COLS;
    const h = Number.isFinite(item.h) ? Math.round(item.h) : null;
    out.push({
      id: card.id,
      w: clamp(w, card.minW || 4, COLS),
      h: h == null ? null : clamp(h, MIN_H, MAX_H),
    });
  }
  return mode === 'guest' ? out.slice(0, GUEST_LIMIT) : out;
}

/**
 * Can `id` be added? Returns { ok: true } or { ok: false, reason }, where
 * reason is 'locked' (a members-only card), 'limit' (guest cap reached) or
 * 'placed' (already on the page).
 */
export function canAdd(layout, cards, mode, id) {
  if (layout.some((i) => i.id === id)) return { ok: false, reason: 'placed' };
  const card = cards.find((c) => c.id === id);
  if (!card) return { ok: false, reason: 'locked' };
  if (mode === 'guest' && !card.guest) return { ok: false, reason: 'locked' };
  if (mode === 'guest' && layout.length >= GUEST_LIMIT) return { ok: false, reason: 'limit' };
  return { ok: true };
}

export function addCard(layout, cards, id) {
  const card = cards.find((c) => c.id === id);
  if (!card || layout.some((i) => i.id === id)) return layout;
  return [...layout, { id, w: clamp(card.w || COLS, card.minW || 4, COLS), h: null }];
}

export const removeCard = (layout, id) => layout.filter((i) => i.id !== id);

/** Move the card at `from` to index `to`. */
export function moveCard(layout, from, to) {
  if (from === to || from < 0 || from >= layout.length) return layout;
  const next = [...layout];
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}

export function resizeCard(layout, cards, id, { w, h }) {
  const card = cards.find((c) => c.id === id);
  return layout.map((i) => {
    if (i.id !== id) return i;
    return {
      ...i,
      w: w == null ? i.w : clamp(Math.round(w), card?.minW || 4, COLS),
      h: h === undefined ? i.h : h === null ? null : clamp(Math.round(h), MIN_H, MAX_H),
    };
  });
}

export const storageKey = (hubId, mode) => `ezana:hub-canvas:v${VERSION}:${hubId}:${mode}`;

/** Browser storage can be absent or throw (private mode, blocked site data):
 *  every access is guarded, and a failure means "no saved layout". */
export function readStored(hubId, mode) {
  try {
    const raw = window.localStorage.getItem(storageKey(hubId, mode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStored(hubId, mode, layout) {
  try {
    window.localStorage.setItem(storageKey(hubId, mode), JSON.stringify(layout));
  } catch {
    /* best effort: the layout still works for this visit */
  }
}

export function clearStored(hubId, mode) {
  try {
    window.localStorage.removeItem(storageKey(hubId, mode));
  } catch {
    /* best effort */
  }
}
