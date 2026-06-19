/**
 * Creator (partner) designation tiers — single source of truth for both the
 * API layer and the UI so the badge looks identical everywhere it appears.
 *
 * Every approved partner is a verified creator by definition (the application
 * is vetted before approval), so these tiers describe STANDING / REACH, not
 * verification. They are intentionally distinct from the ELO "skill" tiers
 * (novice…grandmaster) so a creator's designation never gets confused with a
 * trader's performance rank.
 *
 *   creator   → baseline for every approved partner
 *   featured  → elevated, high-engagement creators; surfaced in discovery
 *   signature → hand-selected marquee creators (e.g. headline influencers)
 */

export const CREATOR_TIERS = {
  creator: {
    key: 'creator',
    label: 'Creator',
    short: 'Creator',
    rank: 1,
    color: '#10b981',
    ring: '#34d399',
    soft: 'rgba(16,185,129,0.13)',
    icon: 'bi-patch-check-fill',
    blurb: 'Verified creator on Ezana',
  },
  featured: {
    key: 'featured',
    label: 'Featured Creator',
    short: 'Featured',
    rank: 2,
    color: '#d4a853',
    ring: '#e8c879',
    soft: 'rgba(212,168,83,0.15)',
    icon: 'bi-star-fill',
    blurb: 'Featured creator — top engagement and quality',
  },
  signature: {
    key: 'signature',
    label: 'Signature Creator',
    short: 'Signature',
    rank: 3,
    color: '#22d3ee',
    ring: '#67e8f9',
    soft: 'rgba(34,211,238,0.15)',
    icon: 'bi-gem',
    blurb: 'Signature creator — a marquee voice on Ezana',
  },
};

export const CREATOR_TIER_LIST = [
  CREATOR_TIERS.creator,
  CREATOR_TIERS.featured,
  CREATOR_TIERS.signature,
];

export const DEFAULT_CREATOR_TIER = 'creator';

/** Resolve a tier key to its config, falling back to the baseline creator tier. */
export function getCreatorTier(key) {
  if (!key) return CREATOR_TIERS[DEFAULT_CREATOR_TIER];
  return CREATOR_TIERS[String(key).toLowerCase()] || CREATOR_TIERS[DEFAULT_CREATOR_TIER];
}

/**
 * Resolve the designation to display for an author. Returns null for
 * non-partners. Accepts either camelCase (UI) or snake_case (DB) shapes.
 */
export function resolveCreatorTier(author) {
  if (!author) return null;
  const isPartner = author.isPartner ?? author.is_partner ?? false;
  if (!isPartner) return null;
  return getCreatorTier(author.creatorTier ?? author.creator_tier);
}
