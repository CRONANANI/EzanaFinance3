// Sonar research workspace (Nov 13 2026): the small client helpers the three boards share
// to fill the right rail, so the ping, country and research boards stay identical.
// Every item comes from data the answer already carries; nothing here invents a step, an
// article or a cost line.

import { deepState } from '@/lib/sonar/estimate-copy';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/** Scroll to an answer section the way the frame's own links do. */
export function scrollToSection(section) {
  if (typeof document === 'undefined' || !section) return;
  document
    .getElementById(`sa-${section}`)
    ?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/**
 * Run one Next Steps item: 'deep' starts deep research, 'run' sends the step's question
 * through the host's own ping path, 'section' scrolls to that section.
 */
export function runWorkspaceStep(step, { onDeep = null, onRun = null } = {}) {
  if (!step) return;
  if (step.action === 'deep' && typeof onDeep === 'function') onDeep();
  else if (step.action === 'run' && typeof onRun === 'function' && step.query) onRun(step.query);
  else if (step.action === 'section') scrollToSection(step.section);
}

/** Steps a host can actually run: without a ping path, 'run' steps are left out. */
export function runnableSteps(steps, { onRun = null } = {}) {
  return (steps || []).filter((s) => s.action !== 'run' || typeof onRun === 'function');
}

function shortDate(value) {
  const t = Date.parse(value || '');
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(t));
}

/** Related research from a ping's matched Echo articles (dossier.echo). */
export function relatedFromDossierEcho(echo) {
  return (Array.isArray(echo) ? echo : [])
    .filter((e) => e && e.slug && e.title)
    .map((e) => ({
      key: `echo:${e.slug}`,
      title: e.title,
      href: `/echo/${e.slug}`,
      kind: 'Ezana Echo',
      meta: shortDate(e.publishedAt),
    }));
}

/**
 * Related research from a research run's Echo evidence. Only internal links are kept, so a
 * stored record can never send the reader off-site from this card.
 */
export function relatedFromEvidence(evidence) {
  const seen = new Set();
  const out = [];
  for (const e of Array.isArray(evidence) ? evidence : []) {
    if (!e || e.source !== 'echo' || !e.title) continue;
    const href = typeof e.url === 'string' && /^\/(?!\/)/.test(e.url) ? e.url : null;
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push({
      key: `echo:${href}`,
      title: e.title,
      href,
      kind: 'Ezana Echo',
      meta: shortDate(e.date),
    });
  }
  return out;
}

/** The deep research cost and quota line, as DeepResearchCard shows it, or null. */
export function deepNoteFrom(estimate, { pingsSpent = 1 } = {}) {
  const state = deepState(estimate, { pingsSpent });
  if (!state) return null;
  const line = [estimate?.deep?.label, state.line].filter(Boolean).join('. ');
  return line || null;
}

/* ── Nov 13 (prompt 3): the Research menu, saved items, the quick ping save body ── */

/** The Research menu's pages, for a signed-in reader. */
export const RESEARCH_PAGES = [
  { key: 'history', label: 'Research history', icon: 'bi-clock-history', href: '/sonar/history' },
  { key: 'saved', label: 'Saved research', icon: 'bi-bookmark', href: '/sonar/saved' },
  { key: 'library', label: 'Research library', icon: 'bi-collection', href: '/sonar/library' },
];

/**
 * The left rail's Research menu. A guest keeps "Current analysis" only. `current` marks the
 * page the reader is on ('current' on an answer).
 */
export function researchMenu({ signedIn = false, current = 'current', withCurrent = true } = {}) {
  const head = withCurrent
    ? [
        {
          key: 'current',
          label: 'Current analysis',
          icon: 'bi-chat-square-text',
          current: current === 'current',
          href: current === 'current' ? undefined : '/sonar',
        },
      ]
    : [];
  if (!signedIn) return head;
  return [...head, ...RESEARCH_PAGES.map((p) => ({ ...p, current: p.key === current }))];
}

/** Related research from the reader's own saved items (at most two). */
export function relatedFromSaved(items) {
  return (Array.isArray(items) ? items : [])
    .filter((s) => s && s.id && s.title)
    .slice(0, 2)
    .map((s) => ({
      key: `saved:${s.id}`,
      title: s.title,
      href: `/sonar/saved/${s.id}`,
      kind: 'Saved research',
      meta: shortDate(s.created_at),
    }));
}

/** Echo matches first (up to three), then the reader's saved items (up to two). */
export const mergeRelated = (echo, saved) => [
  ...(echo || []).slice(0, 3),
  ...relatedFromSaved(saved),
];
