/**
 * Shared server helpers for the Research Library 2a API surface.
 *
 * Not a route (no `route.js`), so App Router ignores it — safe to co-locate.
 * Keeps embedding/serialization/facet logic in one place so the library GET,
 * the dossier, the lineage view and the write paths all agree on shapes.
 */

import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];

export const DOC_TYPES = [
  'note',
  'pitch_memo',
  'model',
  'primer',
  'post_mortem',
  'ic_minutes',
  'reading',
  'competition',
  'external',
];

export const STATUSES = ['draft', 'under_review', 'published', 'archived', 'superseded'];

export function sanitizeDocType(v) {
  return DOC_TYPES.includes(v) ? v : 'note';
}

export function sanitizeStatus(v) {
  return STATUSES.includes(v) ? v : 'draft';
}

/** Text we embed for semantic search — title carries the most signal, then abstract, then body. */
export function buildEmbedText(note) {
  return [note?.title || '', note?.abstract || '', note?.body || '']
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

/** pgvector arrives from PostgREST as a JSON-ish string `"[0.1,0.2,...]"`. */
export function parseVector(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return null;
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Attach author display name + role snapshot to a list of notes. `author_id` on
 * org_research_notes is an auth.users id, mirrored on org_members.user_id.
 */
export async function attachAuthors(supabase, orgId, notes) {
  const list = Array.isArray(notes) ? notes : [];
  const authorIds = [...new Set(list.map((n) => n.author_id).filter(Boolean))];
  if (!authorIds.length)
    return list.map((n) => ({ ...n, author_name: 'Member', author_role: null }));
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, display_name, role')
    .eq('org_id', orgId)
    .in('user_id', authorIds);
  const byUser = new Map((members || []).map((m) => [m.user_id, m]));
  return list.map((n) => ({
    ...n,
    author_name: byUser.get(n.author_id)?.display_name || 'Member',
    // author_role_at_time is the durable snapshot; fall back to the live role.
    author_role: n.author_role_at_time || byUser.get(n.author_id)?.role || null,
  }));
}

/** Strip the heavy embedding vector before returning a note to the client. */
export function stripEmbedding(note) {
  if (!note) return note;
  const { embedding, ...rest } = note;
  return rest;
}

/** Does a note's text contain the keyword query? (case-insensitive substring). */
export function keywordMatch(note, q) {
  if (!q) return true;
  const hay =
    `${note.title || ''} ${note.abstract || ''} ${note.body || ''} ${note.ticker || ''} ${(note.tags || []).join(' ')}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => hay.includes(tok));
}

/** Loose semantic floor — below this a vector match is noise. Mirrors related-markets. */
export const SEMANTIC_FLOOR = 0.72;

/**
 * Reuse the existing Centaur endpoint for AI summaries. Same deployment — we
 * forward the caller's session so /api/centaur/chat authenticates them.
 */
export async function callCentaur(request, prompt) {
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/centaur/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') || '',
      authorization: request.headers.get('authorization') || '',
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], persona: 'yohannes' }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.reply || data?.error || 'AI summary failed');
  return data?.reply || '';
}

function getMulti(searchParams, key) {
  // Accept both `key=a&key=b` and `key[]=a` and comma-joined `key=a,b`.
  const vals = [...searchParams.getAll(key), ...searchParams.getAll(`${key}[]`)];
  const flat = vals
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(flat)];
}

function countFacet(rows, dim) {
  const counts = {};
  for (const r of rows) {
    let keys = [];
    if (dim === 'tags') keys = Array.isArray(r.tags) ? r.tags : [];
    else keys = r[dim] != null && r[dim] !== '' ? [r[dim]] : [];
    for (const k of keys) counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

/**
 * Hybrid library search shared by `GET /` and `GET /search`.
 *
 * Pulls the org's notes (RLS enforces visibility), applies structured multi-
 * select filters, runs keyword + optional semantic ranking on `q`, and returns
 * the matching notes plus REAL facet counts for every filter dimension (each
 * facet counted with all OTHER active filters applied, so the menu counts are
 * honest for the current context).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase  user-scoped client
 * @param {{ org_id: string, user_id: string, role: string }} member
 * @param {URLSearchParams} searchParams
 * @param {{ embedFn?: Function, embedConfigured?: boolean }} deps
 */
export async function librarySearch(supabase, member, searchParams, deps = {}) {
  const q = (searchParams.get('q') || '').trim();
  const filters = {
    doc_type: getMulti(searchParams, 'type'),
    sector: getMulti(searchParams, 'sector'),
    status: getMulti(searchParams, 'status'),
    term: getMulti(searchParams, 'term'),
    author_id: getMulti(searchParams, 'author'),
    ticker: getMulti(searchParams, 'ticker').map((t) => t.toUpperCase()),
  };
  const sort = searchParams.get('sort') || (q ? 'relevance' : 'recent');
  const includeDrafts = searchParams.get('include_drafts') === '1';

  const wantSemantic = !!q && deps.embedConfigured && typeof deps.embedFn === 'function';

  // Pull a bounded working set. RLS already filters visibility + org membership,
  // but we still scope org_id explicitly (defence in depth, matches convention).
  const cols =
    'id, org_id, author_id, title, body, abstract, ticker, sector, tags, visibility, team_id, ' +
    'pinned, doc_type, status, version, superseded_by, term, author_role_at_time, is_alum_authored, ' +
    'is_exemplar, pitch_id, assignment_id, position_id, view_count, download_count, citations, ' +
    'published_at, created_at, updated_at' +
    (wantSemantic ? ', embedding' : '');

  const { data, error } = await supabase
    .from('org_research_notes')
    .select(cols)
    .eq('org_id', member.org_id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return { error: error.message };

  let rows = data || [];

  // Drafts are personal-until-published: only surface a draft to its author
  // (managers still see them for review). Keeps the shared library clean.
  const isManager = MANAGER_ROLES.includes(member.role);
  if (!includeDrafts) {
    rows = rows.filter((r) => r.status !== 'draft' || r.author_id === member.user_id || isManager);
  }

  // Semantic scoring (optional). Compute similarity, keep vectors off the wire.
  let queryVec = null;
  if (wantSemantic) {
    try {
      queryVec = await deps.embedFn(q);
    } catch {
      queryVec = null;
    }
  }
  const scored = rows.map((r) => {
    const kw = keywordMatch(r, q);
    let sim = 0;
    if (queryVec) {
      const v = parseVector(r.embedding);
      if (v) sim = cosine(queryVec, v);
    }
    return { row: r, kw, sim };
  });

  // Keep rows that match the keyword OR clear the semantic floor.
  const qMatched = q ? scored.filter((s) => s.kw || s.sim >= SEMANTIC_FLOOR) : scored;

  // Apply structured filters; build the post-q set. For facet counts we re-count
  // each dimension against the set with every OTHER dimension applied.
  const passesExcept = (s, exceptDim) =>
    Object.entries(filters).every(([dim, sel]) => {
      if (dim === exceptDim || sel.length === 0) return true;
      const val = dim === 'ticker' ? (s.row.ticker || '').toUpperCase() : s.row[dim];
      return sel.includes(val);
    });

  const facets = {
    type: countFacet(
      qMatched.filter((s) => passesExcept(s, 'doc_type')).map((s) => s.row),
      'doc_type',
    ),
    sector: countFacet(
      qMatched.filter((s) => passesExcept(s, 'sector')).map((s) => s.row),
      'sector',
    ),
    status: countFacet(
      qMatched.filter((s) => passesExcept(s, 'status')).map((s) => s.row),
      'status',
    ),
    term: countFacet(
      qMatched.filter((s) => passesExcept(s, 'term')).map((s) => s.row),
      'term',
    ),
    author: countFacet(
      qMatched.filter((s) => passesExcept(s, 'author_id')).map((s) => s.row),
      'author_id',
    ),
    ticker: countFacet(
      qMatched.filter((s) => passesExcept(s, 'ticker')).map((s) => s.row),
      'ticker',
    ),
  };

  const finalScored = qMatched.filter((s) => passesExcept(s, null));

  // Sorting.
  const sorters = {
    recent: (a, b) => new Date(b.row.created_at) - new Date(a.row.created_at),
    views: (a, b) => (b.row.view_count || 0) - (a.row.view_count || 0),
    title: (a, b) => String(a.row.title).localeCompare(String(b.row.title)),
    relevance: (a, b) => {
      const sa = (a.kw ? 0.5 : 0) + a.sim;
      const sb = (b.kw ? 0.5 : 0) + b.sim;
      return sb - sa;
    },
  };
  finalScored.sort(sorters[sort] || sorters.recent);
  // Pinned always floats to the top regardless of sort.
  finalScored.sort((a, b) => (b.row.pinned ? 1 : 0) - (a.row.pinned ? 1 : 0));

  const notes = await attachAuthors(
    supabase,
    member.org_id,
    finalScored.map((s) => stripEmbedding(s.row)),
  );

  // Resolve author facet ids → names for the UI menu.
  const authorNames = {};
  {
    const ids = Object.keys(facets.author);
    if (ids.length) {
      const { data: mem } = await supabase
        .from('org_members')
        .select('user_id, display_name')
        .eq('org_id', member.org_id)
        .in('user_id', ids);
      for (const m of mem || []) authorNames[m.user_id] = m.display_name || 'Member';
    }
  }

  return {
    notes,
    facets,
    authorNames,
    semantic: { enabled: !!queryVec, configured: !!deps.embedConfigured },
    viewer: {
      userId: member.user_id,
      role: member.role,
      canManage: isManager,
    },
  };
}

/**
 * One-pass loader for the Research Library's INITIAL-mount payload. Shared by
 * the `/bootstrap` route (client fallback) and the research-library server page
 * so both agree on the exact shape `ResearchLibrary` seeds its state from — no
 * duplication, no drift.
 *
 * Audit of the component: on mount only the `library` view renders, so the only
 * data consumed is the hybrid library search result (`{ notes, facets,
 * authorNames, semantic, viewer }`). The ticker dossier, coverage-lineage
 * overview and the per-note detail drawer all fetch on demand when the user
 * navigates to them — they are deliberately NOT prefetched here so behavior and
 * the honest-empty states stay identical. Batched via `Promise.all` so any
 * future mount dataset joins the same single round-trip.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase user-scoped client
 * @param {{ org_id: string, user_id: string, role: string }} member
 * @param {URLSearchParams} [searchParams]
 * @returns {Promise<{ library: object } | { error: string }>}
 */
export async function loadResearchBootstrap(supabase, member, searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams();
  const [library] = await Promise.all([
    librarySearch(supabase, member, params, {
      embedFn: embedViaSupabase,
      embedConfigured: supaEmbedConfigured(),
    }),
  ]);
  if (library?.error) return { error: library.error };
  return { library };
}
