/**
 * Company research section stack. Pure, framework-free, tested by
 * scripts/check-research-sections.mjs.
 *
 * The section tabs (Overview, Valuation Models, Financials, Ownership & Flows,
 * News & Sentiment, Filings & Events, Sonar Research) swap
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
  { id: 'models', label: 'Valuation Models', icon: 'bi-layers' },
  { id: 'financials', label: 'Financials', icon: 'bi-bar-chart' },
  { id: 'ownership', label: 'Ownership & Flows', icon: 'bi-people' },
  { id: 'news', label: 'News & Sentiment', icon: 'bi-newspaper' },
  { id: 'filings', label: 'Filings & Events', icon: 'bi-calendar-event' },
  { id: 'sonar', label: 'Sonar Research', icon: 'bi-broadcast' },
];

export const DEFAULT_SECTION = 'overview';
const IDS = new Set(SECTIONS.map((s) => s.id));

/**
 * Nov 19th, 2026: Models, Valuation, Earnings and Peers were consolidated into
 * Valuation Models. Old ?section= links and saved pins land on the tab that
 * now holds the capability; LEGACY_SECTION_TOOL says which model to open.
 */
export const LEGACY_SECTIONS = {
  valuation: 'models',
  earnings: 'models',
  peers: 'models',
};
export const LEGACY_SECTION_TOOL = {
  earnings: 'earnings',
  peers: 'comps',
};

/** Current section id for any id, old or new; null when unknown. */
export function migrateSection(id) {
  if (IDS.has(id)) return id;
  return LEGACY_SECTIONS[id] || null;
}

export const isSectionId = (id) => IDS.has(id);

export const sectionLabel = (id) => SECTIONS.find((s) => s.id === id)?.label || id;

/** @typedef {{ active: string, pinned: string[] }} StackState */

/** @returns {StackState} */
export function initStack({ active, pinned } = {}) {
  const cleanPinned = [
    ...new Set((Array.isArray(pinned) ? pinned : []).map(migrateSection).filter(Boolean)),
  ];
  const act = migrateSection(active);
  return {
    active: act || DEFAULT_SECTION,
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
