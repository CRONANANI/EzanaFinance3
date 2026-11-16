/**
 * Council band of Ezana Echo (/ezana-echo): the pure model.
 *
 * Council members see the public Echo front page unchanged plus one band,
 * "For our council", built here from two kinds of data:
 *   - Echo's own published stories (the same hub every reader gets), with
 *     the tickers the editor tagged on each one, and
 *   - the council's own records, read as the signed-in member: the position
 *     book, sector teams and coverage (GET /api/org/company-research), and
 *     the council's published research, pitches and member directory
 *     (GET /api/org/ezana-echo).
 * The live routes and the sample bundles hand over the same raw shapes, so
 * one set of functions draws both.
 *
 * Honesty rules:
 * - A story is "on our names" only when the editor tagged it with a ticker
 *   the council holds or has an open pitch on. No text matching, no guesses.
 * - Echo keeps cumulative read totals only, so nothing here says who in the
 *   council read what. Saved lists are private: the viewer sees only their
 *   own.
 * - Assignments cannot point at an Echo story today, so there is no
 *   "required reading" card.
 * - A missing figure is N/A.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { councilTeams } from './org-global-market-model.js';

export const NA = 'N/A';

const upper = (t) =>
  String(t || '')
    .toUpperCase()
    .trim();

/* Stages that are no longer in the pipeline: decided, held or dropped. */
const CLOSED_STAGES = new Set(['rejected', 'exited', 'in_portfolio', 'approved']);

const STAGE = {
  idea: 'Idea',
  screening: 'Screening',
  deep_dive: 'Deep dive',
  cross_desk_review: 'Cross-desk review',
  pitch_scheduled: 'Pitch scheduled',
  ic_vote: 'Committee vote',
};
export const stageWord = (s) => STAGE[s] || (s ? String(s).replace(/_/g, ' ') : NA);

/** Oct 31 (UTC, so a label never shifts a day). */
export function fmtShort(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export const LINKS = {
  teamHub: '/org-team-hub',
  library: '/org-team-hub/research-library',
  doc: (id) => `/org-team-hub/research-library?d=${encodeURIComponent(id)}`,
  pitches: '/org-team-hub/pitches',
  pitch: (id) => `/org-team-hub/pitches?pitch=${encodeURIComponent(id)}`,
  orgChart: '/org-team-hub/org-chart',
  trading: '/org-trading',
};

/* ── The council's names ────────────────────────────────────────────────── */

/** Pitches still in the pipeline, newest first. */
export function openPitches(pitches) {
  return (pitches || [])
    .filter((p) => p && p.ticker && !p.archived_at && !CLOSED_STAGES.has(p.stage))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

/**
 * The tickers that drive "Echo on our names" and the Our names tab: what the
 * council holds plus what it has open pitches on.
 * @returns {{ held: Set<string>, pitch: Set<string>, all: Set<string> }}
 */
export function ourTickers(fundRaw, pitches) {
  const held = new Set((fundRaw?.positions || []).map((p) => upper(p.ticker)).filter(Boolean));
  const pitch = new Set(openPitches(pitches).map((p) => upper(p.ticker)));
  return { held, pitch, all: new Set([...held, ...pitch]) };
}

const byNewest = (a, b) =>
  new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();

/**
 * Echo stories tagged with one of the council's tickers, newest first.
 * Each row names the first matching ticker and whether it is held or pitched.
 */
export function namesRows(stories, tickers, limit = 5) {
  const all = tickers?.all || new Set();
  const matched = (stories || [])
    .map((s) => ({ s, hits: (s.tickers || []).filter((t) => all.has(t)) }))
    .filter((x) => x.hits.length)
    .sort((a, b) => byNewest(a.s, b.s));
  return {
    total: matched.length,
    rows: matched.slice(0, limit).map(({ s, hits }) => {
      const held = hits.find((t) => tickers.held.has(t));
      const ticker = held || hits[0];
      return {
        id: s.id,
        href: s.href,
        title: s.title,
        date: fmtShort(s.publishedAt),
        ticker,
        kind: held ? 'Held' : 'Open pitch',
        more: hits.length - 1,
      };
    }),
  };
}

/** How many Echo stories carry each ticker. */
function storiesByTicker(stories) {
  const by = new Map();
  for (const s of [...(stories || [])].sort(byNewest)) {
    for (const t of s.tickers || []) {
      if (!by.has(t)) by.set(t, []);
      by.get(t).push(s);
    }
  }
  return by;
}

/**
 * Pitch prep reading: open pitches that have Echo stories on them, each with
 * the newest story and how many there are.
 */
export function pitchPrepRows(stories, pitches, members = [], limit = 5) {
  const open = openPitches(pitches);
  const by = storiesByTicker(stories);
  const name = new Map((members || []).map((m) => [m.id, m.display_name]));
  const seen = new Set();
  const rows = [];
  for (const p of open) {
    const t = upper(p.ticker);
    if (seen.has(t)) continue;
    seen.add(t);
    const list = by.get(t) || [];
    if (!list.length) continue;
    rows.push({
      id: p.id,
      ticker: t,
      company: p.company_name || t,
      stage: stageWord(p.stage),
      lead: name.get(p.analyst_member_id) || null,
      story: { id: list[0].id, title: list[0].title, href: list[0].href },
      count: list.length,
    });
  }
  return { open: open.length, rows: rows.slice(0, limit), total: rows.length };
}

/* ── The reader's own list ──────────────────────────────────────────────── */

/**
 * The viewer's saved stories, newest save first. Saved ids that are no
 * longer published (archived, unpublished) are counted, not shown.
 */
export function savedRows(stories, saved, limit = 5) {
  const byId = new Map((stories || []).map((s) => [s.id, s]));
  const list = (saved || []).filter((x) => x && x.id);
  const rows = [];
  for (const x of list) {
    const s = byId.get(x.id);
    if (!s) continue;
    rows.push({ id: s.id, href: s.href, title: s.title, date: fmtShort(x.savedAt) });
  }
  return { total: rows.length, missing: list.length - rows.length, rows: rows.slice(0, limit) };
}

/** Sample content: three real stories shown as a saved list (no save date). */
export function sampleSavedRows(stories) {
  const rows = [...(stories || [])]
    .sort(byNewest)
    .slice(0, 3)
    .map((s) => ({ id: s.id, href: s.href, title: s.title, date: NA }));
  return { total: rows.length, missing: 0, rows };
}

/* ── The council's own research ─────────────────────────────────────────── */

/**
 * Council reads: published research, exemplars first, then pinned, then
 * newest. Links open the document in the Research Library.
 */
export function councilReads(notes, members = [], limit = 5) {
  const byUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));
  const when = (n) => new Date(n.published_at || n.created_at || 0).getTime();
  return (notes || [])
    .filter((n) => n && n.status === 'published')
    .sort(
      (a, b) =>
        Number(Boolean(b.is_exemplar)) - Number(Boolean(a.is_exemplar)) ||
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        when(b) - when(a),
    )
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      href: LINKS.doc(n.id),
      title: n.title || 'Untitled',
      kind: n.is_exemplar ? 'Exemplar' : 'Published',
      author: byUser.get(n.author_id) || 'Former member',
      date: fmtShort(n.published_at || n.created_at),
    }));
}

/* ── Sector coverage ────────────────────────────────────────────────────── */

/**
 * Each sector team with who covers it, its holdings, and the Echo stories
 * tagged with those holdings (count and the newest).
 */
export function sectorRows(fundRaw, stories) {
  const by = storiesByTicker(stories);
  return councilTeams(fundRaw).map((t) => {
    const list = [];
    const ids = new Set();
    for (const tk of t.tickers) {
      for (const s of by.get(tk) || []) {
        if (!ids.has(s.id)) {
          ids.add(s.id);
          list.push(s);
        }
      }
    }
    list.sort(byNewest);
    return {
      id: t.id,
      name: t.name,
      owners: t.owners.length ? t.owners.join(', ') : NA,
      holdings: t.tickers.length,
      count: list.length,
      latest: list[0] ? { title: list[0].title, href: list[0].href } : null,
    };
  });
}

/* ── The strip ──────────────────────────────────────────────────────────── */

export function stripFigures(fundRaw, pitches, namesTotal) {
  const tickers = ourTickers(fundRaw, pitches);
  return {
    holdings: tickers.held.size,
    heldList: [...tickers.held],
    teams: (fundRaw?.teams || []).map((t) => t.name).filter(Boolean),
    pitches: tickers.pitch.size,
    pitchList: [...tickers.pitch],
    stories: namesTotal,
  };
}
