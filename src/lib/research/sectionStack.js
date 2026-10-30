/**
 * Company research section stack. Pure, framework-free, tested by
 * scripts/check-research-sections.mjs.
 *
 * The section tabs (Overview, Models, Valuation, Earnings, News, Peers) swap
 * content in place instead of scrolling to anchors, and any section can be
 * pinned. Rules:
 *  - the active section renders first, directly under the tab bar
 *  - pinned sections follow, most recently pinned first
 *  - a section is never rendered twice
 *  - switching tabs never unpins anything
 *  - unpinning the active section keeps it on screen
 */

export const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'bi-grid-1x2' },
  { id: 'models', label: 'Models', icon: 'bi-cpu' },
  { id: 'valuation', label: 'Valuation', icon: 'bi-cash-stack' },
  { id: 'earnings', label: 'Earnings', icon: 'bi-bar-chart-line' },
  { id: 'news', label: 'News', icon: 'bi-newspaper' },
  { id: 'peers', label: 'Peers', icon: 'bi-people' },
];

export const DEFAULT_SECTION = 'overview';
const IDS = new Set(SECTIONS.map((s) => s.id));

export const isSectionId = (id) => IDS.has(id);

export const sectionLabel = (id) => SECTIONS.find((s) => s.id === id)?.label || id;

/** @typedef {{ active: string, pinned: string[] }} StackState */

/** @returns {StackState} */
export function initStack({ active, pinned } = {}) {
  const cleanPinned = [...new Set((Array.isArray(pinned) ? pinned : []).filter(isSectionId))];
  return {
    active: isSectionId(active) ? active : DEFAULT_SECTION,
    pinned: cleanPinned,
  };
}

/** Open a tab. Pins are untouched. */
export function selectSection(state, id) {
  if (!isSectionId(id) || state.active === id) return state;
  return { ...state, active: id };
}

/** Pin or unpin a section. A newly pinned section goes to the front of the pinned list. */
export function togglePin(state, id) {
  if (!isSectionId(id)) return state;
  const pinnedNow = state.pinned.includes(id);
  return {
    ...state,
    pinned: pinnedNow ? state.pinned.filter((p) => p !== id) : [id, ...state.pinned],
  };
}

export const isPinned = (state, id) => state.pinned.includes(id);

/** Ordered list of section ids to render. */
export function visibleSections(state) {
  return [state.active, ...state.pinned.filter((p) => p !== state.active)];
}
