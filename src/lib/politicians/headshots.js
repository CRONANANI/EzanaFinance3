/**
 * Politician headshot resolution — single source of truth used by face cards,
 * the trades-table mini-avatars, and the drill-down modal on the Political Trade
 * Tracker page.
 *
 * Priority order:
 *   1. MANUAL OVERRIDES below (must be LICENSED or PUBLIC-DOMAIN images we host
 *      locally under /public/politicians/). Ships empty/commented-out.
 *   2. Official congressional portrait by BioGuideID (public domain, from the
 *      unitedstates project's image set).
 *   3. null → caller renders the silhouette + initials + party ring fallback.
 *
 * The DEFAULT is the official public-domain portraits: every member is covered
 * legally with zero manual work. The override map exists for the day Ezana has
 * licensed photography — do NOT hotlink press/news-agency URLs, and do NOT enable
 * an override for an image we don't have the rights to use.
 */

/**
 * key: normalized member name (lowercase, letters + spaces only) → local asset path.
 *
 * ⚠️ LICENSING: only add images Ezana has the rights to use (licensed or public
 * domain), hosted locally in /public/politicians/. The five entries below are the
 * operator-provided press photos (Tuberville, Pelosi, Crenshaw, Gottheimer,
 * Hickenlooper) — they appear to be editorial/news-agency shots, so they stay
 * COMMENTED OUT until their commercial licensing is confirmed. Uncomment an entry
 * (and drop the file into /public/politicians/) only once its rights are cleared.
 */
const HEADSHOT_OVERRIDES = {
  // 'tommy tuberville':  '/politicians/tommy-tuberville.png',
  // 'nancy pelosi':      '/politicians/nancy-pelosi.png',
  // 'dan crenshaw':      '/politicians/dan-crenshaw.png',
  // 'josh gottheimer':   '/politicians/josh-gottheimer.png',
  // 'john hickenlooper': '/politicians/john-hickenlooper.png',
};

/** Normalize a member name to the override-map key format. */
export function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim();
}

/**
 * Resolve a politician's headshot.
 * @param {{ name?: string, bioguideId?: string|null }} member
 * @returns {{ src: string, source: 'override'|'official' }|null}
 *   null → caller should render the silhouette + initials fallback.
 */
export function resolveHeadshot({ name, bioguideId } = {}) {
  const key = normalizeName(name);
  if (key && HEADSHOT_OVERRIDES[key]) {
    return { src: HEADSHOT_OVERRIDES[key], source: 'override' };
  }
  if (bioguideId) {
    // Official congressional portraits — public domain, addressable by BioGuideID.
    // 450x550 is a real size variant of the unitedstates project's image set.
    // Callers MUST wire onError → silhouette fallback (a given id can 404).
    return {
      src: `https://unitedstates.github.io/images/congress/450x550/${bioguideId}.jpg`,
      source: 'official',
    };
  }
  return null;
}

/** Host of the official-portrait source (for next.config images.remotePatterns). */
export const OFFICIAL_PORTRAIT_HOST = 'unitedstates.github.io';
