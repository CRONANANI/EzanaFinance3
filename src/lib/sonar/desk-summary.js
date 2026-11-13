// src/lib/sonar/desk-summary.js
// The Desk Summary card (Sonar research workspace, Nov 13 2026): pure view helpers shared by
// the ping, country and research boards, so all three cards read the same. No I/O; tested in
// scripts/check-sonar-workspace.mjs.

export const MODE_LABEL = {
  quick: 'Quick ping',
  standard: 'Standard research',
  deep: 'Deep research',
};

/** When the answer was produced, in the reader's locale, from the answer's own timestamp. */
export function answeredLabel(iso, locale = undefined) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(t));
}

/** A date-only label ("Nov 12, 2026") for "Data as of" and source rows. */
export function dayLabel(value, locale = undefined) {
  const s = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T12:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(t));
}

const DESCRIPTOR = {
  dataset: 'Ezana dataset',
  publisher: 'Data publisher',
  web: 'Web page',
  news: 'News',
};

/**
 * The Evidence and sources rows from a board's resources (pingResources / researchResources:
 * [{ key, kind, label, sub, href, external, date? }]). A web page or news story is named by its
 * site and described by its own title; a dataset or publisher by its own name and category.
 * -> [{ key, name, initial, descriptor, date, href, external }]
 */
export function deskSourceRows(resources, max = 3) {
  return (Array.isArray(resources) ? resources : [])
    .filter((r) => r && r.label)
    .slice(0, max)
    .map((r) => {
      const page = r.kind === 'web' || r.kind === 'news';
      const name = String((page ? r.sub : r.label) || r.label).trim();
      return {
        key: r.key || `${r.kind}:${r.label}`,
        name,
        initial: (name.match(/[\p{L}\p{N}]/u)?.[0] || '?').toUpperCase(),
        descriptor: page ? String(r.label) : String(r.sub || DESCRIPTOR[r.kind] || ''),
        date: r.date ? dayLabel(r.date) : null,
        href: r.href || null,
        external: Boolean(r.external),
      };
    });
}

/** Takeaways: the payload's own when it has two or more, else the board's fallback list. */
export function deskTakeaways(primary, fallback = []) {
  const clean = (list) =>
    (Array.isArray(list) ? list : []).map((t) => String(t || '').trim()).filter(Boolean);
  const a = clean(primary);
  if (a.length >= 2) return a.slice(0, 5);
  const b = clean(fallback);
  return b.length >= 2 ? b.slice(0, 5) : [];
}

/** Summary paragraphs from the payload's summary string ("\n\n" between paragraphs). */
export const summaryParas = (summary) =>
  String(summary || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
