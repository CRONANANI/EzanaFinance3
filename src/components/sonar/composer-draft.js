'use client';

/**
 * The Research Composer draft (Nov 23 2026): one composition shared by every composer on
 * Sonar (the home page, a result page, a follow-up), so they never disagree about what is
 * attached. Kept in sessionStorage for the tab: it survives the move from the home page to
 * the result, closing and reopening the menu, and the EzanaQL builder. A composer restores
 * it only for the same question; an unrelated question starts empty. Photos are not kept
 * (their text is read once and is large).
 */

const KEY = 'sonar:composer:draft:v4';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const norm = (q) =>
  String(q || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function saveComposerDraft({ question, context = [], analyses = [] }) {
  if (typeof window === 'undefined') return;
  try {
    const keep = context.filter((c) => c.kind !== 'photo' && c.status === 'ready');
    if (!keep.length && !analyses.length) {
      window.sessionStorage.removeItem(KEY);
      return;
    }
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({
        question: norm(question),
        context: keep,
        analyses: analyses.filter((a) => a.origin !== 'auto'),
        at: Date.now(),
      }),
    );
  } catch {
    /* storage full or blocked: the composition simply is not carried over */
  }
}

export function loadComposerDraft(question) {
  if (typeof window === 'undefined') return null;
  try {
    const d = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
    if (!d || Date.now() - (d.at || 0) > MAX_AGE_MS) return null;
    if (!question || norm(question) !== d.question) return null;
    return d;
  } catch {
    return null;
  }
}
