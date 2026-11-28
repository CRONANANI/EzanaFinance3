/**
 * Sonar Companion: UI preferences (Nov 28 2026).
 *
 * Only non-sensitive interface choices are stored on the device: opening mode, side, sidebar
 * width, docked or overlay, suggestions on or off, restore last conversation, start
 * minimized, density. Research payloads, questions and organization records are never
 * written to browser storage. Unknown keys are dropped on read and on write.
 *
 * Pure apart from the storage helpers, which take the storage object as an argument.
 */

export const PREFS_KEY = 'ezana:sonar-companion:prefs:v1';
export const MODES = ['compact', 'sidebar'];
export const SIDES = ['right', 'left'];
export const DENSITIES = ['comfortable', 'compact'];
export const WIDTH_MIN = 400;
export const WIDTH_MAX = 680;
export const WIDTH_DEFAULT = 480;

export const DEFAULT_PREFS = Object.freeze({
  openMode: 'compact',
  side: 'right',
  width: WIDTH_DEFAULT,
  docked: false,
  suggestions: true,
  restoreLast: true,
  startMinimized: true,
  density: 'comfortable',
});

const clampWidth = (w) => {
  const n = Math.round(Number(w));
  return Number.isFinite(n) ? Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, n)) : WIDTH_DEFAULT;
};

/** A clean preferences object from anything (a stored value, a form). */
export function sanitizePrefs(raw = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    openMode: MODES.includes(r.openMode) ? r.openMode : DEFAULT_PREFS.openMode,
    side: SIDES.includes(r.side) ? r.side : DEFAULT_PREFS.side,
    width: clampWidth(r.width ?? DEFAULT_PREFS.width),
    docked: typeof r.docked === 'boolean' ? r.docked : DEFAULT_PREFS.docked,
    suggestions: typeof r.suggestions === 'boolean' ? r.suggestions : DEFAULT_PREFS.suggestions,
    restoreLast: typeof r.restoreLast === 'boolean' ? r.restoreLast : DEFAULT_PREFS.restoreLast,
    startMinimized:
      typeof r.startMinimized === 'boolean' ? r.startMinimized : DEFAULT_PREFS.startMinimized,
    density: DENSITIES.includes(r.density) ? r.density : DEFAULT_PREFS.density,
  };
}

export function loadPrefs(storage) {
  try {
    return sanitizePrefs(JSON.parse(storage?.getItem(PREFS_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(storage, prefs) {
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(sanitizePrefs(prefs)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether docked mode fits: the page keeps at least `minContent` px beside the sidebar.
 * Otherwise the sidebar overlays the page, so no dashboard is squeezed into overflow.
 */
export function canDock(viewportWidth, width, minContent = 960) {
  return Number(viewportWidth) - clampWidth(width) >= minContent;
}

/** Keyboard resizing: 24px steps, Home and End to the limits. */
export function resizeStep(width, key) {
  const w = clampWidth(width);
  if (key === 'ArrowLeft') return clampWidth(w + 24);
  if (key === 'ArrowRight') return clampWidth(w - 24);
  if (key === 'Home') return WIDTH_MIN;
  if (key === 'End') return WIDTH_MAX;
  return w;
}
