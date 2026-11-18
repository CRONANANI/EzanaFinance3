/**
 * Mobile bottom bar (Nov 18 2026): the pages a member can pin to the four
 * customisable slots. Trade always sits in the centre and is not in this
 * list. Choices are kept per browser in localStorage under STORAGE_KEY;
 * a stored id that is no longer in the catalogue is dropped, and empty
 * slots fall back to the defaults.
 */
export const STORAGE_KEY = 'ezana.mobileNav.v1';
export const SLOT_COUNT = 4;
export const CHANGE_EVENT = 'ezana:mobile-nav-change';
export const OPEN_EVENT = 'ezana:customize-mobile-nav';

/* `href` may be a function of the member's profile link. */
export const NAV_CATALOG = [
  { id: 'home', label: 'Home', icon: 'bi-house', href: '/home' },
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', href: '/home-dashboard' },
  { id: 'community', label: 'Community', icon: 'bi-people', href: '/community' },
  { id: 'profile', label: 'Profile', icon: 'bi-person-circle', href: (p) => p },
  { id: 'sonar', label: 'Sonar', icon: 'bi-broadcast', href: '/sonar' },
  { id: 'watchlist', label: 'Watchlist', icon: 'bi-bookmark', href: '/watchlist' },
  { id: 'equities', label: 'US Equities', icon: 'bi-bar-chart-line', href: '/company-research' },
  { id: 'capitol', label: 'Capitol', icon: 'bi-bank', href: '/inside-the-capitol' },
  { id: 'markets', label: 'Markets', icon: 'bi-globe2', href: '/market-analysis' },
  { id: 'echo', label: 'Echo', icon: 'bi-newspaper', href: '/ezana-echo' },
  { id: 'quant', label: 'Quant Lab', icon: 'bi-calculator', href: '/for-the-quants' },
  { id: 'mock', label: 'Mock', icon: 'bi-controller', href: '/trading/mock' },
  { id: 'messages', label: 'Messages', icon: 'bi-chat-dots', href: '/community/messages' },
  { id: 'learning', label: 'Learning', icon: 'bi-mortarboard', href: '/learning-center' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'bi-trophy', href: '/leaderboard' },
  { id: 'datasets', label: 'Datasets', icon: 'bi-database', href: '/datasets' },
];

export const DEFAULT_SLOTS = ['home', 'dashboard', 'community', 'profile'];

const byId = new Map(NAV_CATALOG.map((i) => [i.id, i]));

/** Four valid, distinct ids: stored ones first, defaults filling the gaps. */
export function normaliseSlots(ids) {
  const out = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (byId.has(id) && !out.includes(id)) out.push(id);
    if (out.length === SLOT_COUNT) return out;
  }
  for (const id of DEFAULT_SLOTS) {
    if (out.length === SLOT_COUNT) break;
    if (!out.includes(id)) out.push(id);
  }
  for (const item of NAV_CATALOG) {
    if (out.length === SLOT_COUNT) break;
    if (!out.includes(item.id)) out.push(item.id);
  }
  return out;
}

export function readSlots() {
  try {
    return normaliseSlots(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return [...DEFAULT_SLOTS];
  }
}

export function writeSlots(ids) {
  const next = normaliseSlots(ids);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  } catch {
    /* no window */
  }
  return next;
}

export function itemFor(id, profileHref) {
  const item = byId.get(id);
  if (!item) return null;
  return { ...item, href: typeof item.href === 'function' ? item.href(profileHref) : item.href };
}
