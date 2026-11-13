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
