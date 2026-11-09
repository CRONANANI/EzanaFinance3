/**
 * Community page redesign (Nov 2026): pure helpers shared by the API routes
 * and the components. No I/O, so scripts/check-community-redesign.mjs runs
 * them directly.
 */

/* The period the existing leaderboard (mv_portfolio_leaderboard) is built for. */
export const LEADERBOARD_PERIOD = 'yearly';

export const FEED_TABS = ['following', 'trending', 'latest'];
export const FEED_PAGE = 20;

export const TITLE_MIN = 3;
export const TITLE_MAX = 160;

export function normalizeTab(v) {
  const t = String(v || '').toLowerCase();
  return FEED_TABS.includes(t) ? t : null;
}

/** A topic slug as stored in community_topics (lowercase, digits, dashes). */
export function normalizeTopic(v) {
  const t = String(v || '')
    .trim()
    .toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(t) && t !== 'all' ? t : null;
}

/** Markdown and links out, whitespace collapsed: the feed excerpt. */
export function stripMarkdown(s) {
  return String(s || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__|\*|_|~~)(.*?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(content, title, max = 240) {
  let text = stripMarkdown(content);
  /* The feed falls back to the first line as the title; don't repeat it. */
  const t = stripMarkdown(title);
  if (t && text.startsWith(t)) text = text.slice(t.length).trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trim()}…`;
}

export function validateTitle(v) {
  const t = String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length < TITLE_MIN)
    return { ok: false, error: `Add a title of at least ${TITLE_MIN} characters.` };
  if (t.length > TITLE_MAX)
    return { ok: false, error: `Keep the title under ${TITLE_MAX} characters.` };
  return { ok: true, value: t };
}

const nf = new Intl.NumberFormat('en-US');
export const groupNumber = (n) => (Number.isFinite(Number(n)) ? nf.format(Number(n)) : '0');

export function compactNumber(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(Math.round(v));
}

/** "+3.40%", "-1.10%"; null when not a number. */
export function signedPct(v, digits = 2) {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return null;
  const s = Math.abs(n).toFixed(digits);
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${s}%`;
}

/** "Now", "6m ago", "6h ago", "Yesterday", "3d ago", then "Oct 4" / "Oct 4, 2025". */
export function relativeTime(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'Now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2 * 86400) return 'Yesterday';
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function initials(name) {
  return (
    String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase() || '?'
  );
}

/** Display name from a public_profiles row. */
export function displayNameOf(p) {
  return (p?.display_name || p?.full_name || p?.username || 'Member').trim();
}
