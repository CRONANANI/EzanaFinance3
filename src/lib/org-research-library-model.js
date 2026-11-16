/**
 * Research Library (/org-team-hub/research-library): the page's rules in one
 * pure module. The library search on the server, the sample bundle, the page
 * and the tests all read it, so a count, a right or a blocker means the same
 * thing everywhere.
 *
 * The rules here mirror the routes under /api/org/research-notes and the row
 * policies in supabase/migrations; the server checks every request again.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { GICS_SECTORS } from './org-chart-model.js';

export const NA = 'N/A';
export const STALE_DAYS = 90;
const DAY = 86400000;
export const MANAGER_ROLES = ['executive', 'portfolio_manager'];
/* The server loads at most this many documents (newest first, pinned first). */
export const LOAD_LIMIT = 1000;

export const DOC_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'pitch_memo', label: 'Pitch memo' },
  { value: 'model', label: 'Model' },
  { value: 'primer', label: 'Primer' },
  { value: 'post_mortem', label: 'Post-mortem' },
  { value: 'ic_minutes', label: 'IC minutes' },
  { value: 'reading', label: 'Reading' },
  { value: 'competition', label: 'Competition' },
  { value: 'external', label: 'External' },
];
export const DOC_TYPE_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

export const STATUSES = ['draft', 'under_review', 'published', 'archived', 'superseded'];
export const STATUS_LABEL = {
  draft: 'Draft',
  under_review: 'Under review',
  published: 'Published',
  archived: 'Archived',
  superseded: 'Superseded',
};
/* Status is text with an icon, never colour alone. */
export const STATUS_ICON = {
  draft: 'bi-pencil',
  under_review: 'bi-hourglass-split',
  published: 'bi-check2-circle',
  archived: 'bi-archive',
  superseded: 'bi-arrow-repeat',
};

/* The eleven standard sectors the editor offers (the same list as the Org chart). */
export const SECTORS = GICS_SECTORS;

/*
 * Visibility, with what each choice does. "My team" is enforced by the read
 * rule in 20261121090000_org_research_team_visibility.sql: the author, their
 * team, and the council's executives and portfolio managers.
 */
export const VISIBILITY = [
  { value: 'org', label: 'Whole council', hint: 'Every council member can read it.' },
  {
    value: 'team',
    label: 'My team',
    hint: 'You, your team, and executives and portfolio managers can read it.',
  },
  {
    value: 'private',
    label: 'Private',
    hint: 'Only you can read it. Managers cannot see it or review it.',
  },
];
export const VISIBILITY_LABEL = { org: 'Whole council', team: 'My team', private: 'Private' };

export const KIND_LABEL = {
  pdf: 'PDF',
  sheet: 'Sheet',
  doc: 'Document',
  deck: 'Deck',
  image: 'Image',
};
export const KIND_ICON = {
  pdf: 'bi-file-earmark-pdf',
  sheet: 'bi-file-earmark-spreadsheet',
  doc: 'bi-file-earmark-text',
  deck: 'bi-file-earmark-slides',
  image: 'bi-file-earmark-image',
};
export const FILE_ACCEPT = '.pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,.pptx';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const EXT_KIND = {
  pdf: 'pdf',
  xlsx: 'sheet',
  xls: 'sheet',
  csv: 'sheet',
  docx: 'doc',
  doc: 'doc',
  pptx: 'deck',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
};
export function kindOfFile(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return (m && EXT_KIND[m[1].toLowerCase()]) || null;
}

export const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};
export function roleLabel(role) {
  if (!role) return null;
  return ROLE_LABEL[role] || String(role).replace(/_/g, ' ');
}

export function docTypeLabel(v) {
  return DOC_TYPE_LABEL[v] || (v ? String(v).replace(/_/g, ' ') : NA);
}
export function statusLabel(v) {
  return STATUS_LABEL[v] || (v ? String(v).replace(/_/g, ' ') : NA);
}

/* ── Formatting ──────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** "Nov 15, 2026" (UTC, so the server and the page agree), or N/A. */
export function fmtDate(iso) {
  const d = toDate(iso);
  if (!d) return NA;
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}, ${d.getUTCFullYear()}`;
}
/** "Nov 15, 2026 10:24 UTC", or N/A. */
export function fmtStamp(iso) {
  const d = toDate(iso);
  if (!d) return NA;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${fmtDate(iso)} ${hh}:${mm} UTC`;
}
export function fmtBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return NA;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}
/** Signed percentage with one decimal ("+12.0%", "-3.5%"), or N/A. */
export function fmtSignedPct(v, digits = 1) {
  if (v === null || v === undefined || v === '') return NA;
  const n = Number(v);
  if (!Number.isFinite(n)) return NA;
  const s = Math.abs(n).toFixed(digits);
  if (Number(s) === 0) return `${(0).toFixed(digits)}%`;
  return `${n > 0 ? '+' : '-'}${s}%`;
}
/** Share of claims verified (0 to 1) as a whole percent, or N/A. */
export function fmtShare(v) {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return NA;
  return `${Math.round(n * 100)}%`;
}
export function daysSince(iso, now = Date.now()) {
  const d = toDate(iso);
  if (!d) return null;
  return Math.max(0, Math.floor((now - d.getTime()) / DAY));
}
export function fmtInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return NA;
  return Math.round(v).toLocaleString('en-US');
}
export function cleanTitle(t) {
  return (
    String(t || '')
      .replace(/^\s*\[(demo|sample)\]\s*/i, '')
      .trim() || 'Untitled'
  );
}

/* ── Page address ────────────────────────────────────────────────────────── */

export const VIEWS = ['library', 'ticker', 'lineage'];
export const FILTER_KEYS = ['type', 'sector', 'status', 'term', 'author', 'ticker'];
export const FILTER_LABEL = {
  type: 'Type',
  sector: 'Sector',
  status: 'Status',
  term: 'Term',
  author: 'Author',
  ticker: 'Ticker',
};

export function emptyFilters() {
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, []]));
}
export function hasFilters(filters) {
  return FILTER_KEYS.some((k) => (filters?.[k] || []).length > 0);
}
const cleanTicker = (v) =>
  String(v || '')
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '')
    .slice(0, 12);

/**
 * Read the page address. `get(key)` returns one value or null (so this works
 * with URLSearchParams and with Next's searchParams object alike).
 */
export function parseAddress(get) {
  const one = (k) => {
    const v = get(k);
    return Array.isArray(v) ? v[0] || null : v || null;
  };
  const view = VIEWS.includes(one('view')) ? one('view') : 'library';
  const filters = emptyFilters();
  for (const k of FILTER_KEYS) {
    const raw = one(k);
    if (!raw) continue;
    const vals = [
      ...new Set(
        String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ].slice(0, 20);
    filters[k] = k === 'ticker' ? vals.map(cleanTicker).filter(Boolean) : vals;
  }
  return {
    view,
    q: String(one('q') || '').slice(0, 200),
    filters,
    open: one('d') ? String(one('d')).slice(0, 80) : null,
    symbol: cleanTicker(one('symbol')) || null,
    chain: cleanTicker(one('chain')) || null,
    /* ?new=note opens the editor for a new document (the Council view of
       Global Market Analysis links here). It is not written back. */
    compose: one('new') === 'note',
  };
}

/** The query string for the page address (without "?"). */
export function addressQuery({ view, q, filters, open, symbol, chain }) {
  const sp = new URLSearchParams();
  if (view && view !== 'library') sp.set('view', view);
  if (q) sp.set('q', q);
  for (const k of FILTER_KEYS) {
    const vals = filters?.[k] || [];
    if (vals.length) sp.set(k, vals.join(','));
  }
  if (view === 'ticker' && symbol) sp.set('symbol', symbol);
  if (view === 'lineage' && chain) sp.set('chain', chain);
  if (open) sp.set('d', open);
  return sp.toString();
}

/** Query parameters for the library search route. */
export function searchQuery(q, filters) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  for (const k of FILTER_KEYS) {
    const vals = filters?.[k] || [];
    if (vals.length) sp.set(k, vals.join(','));
  }
  return sp.toString();
}

/* ── Rights (mirrors of the routes; the server decides) ──────────────────── */

export function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

/**
 * What the viewer may do with one document, exactly as the routes allow it:
 * - edit, submit, back to draft, supersede, delete: author or manager
 *   (PATCH, /supersede, DELETE on /research-notes/:id)
 * - pin: the PATCH route accepts it from the author or a manager
 * - exemplar: managers only
 * - publish: the author for their own work; for someone else's, an executive
 *   always, a portfolio manager with the approval right (/publish)
 * - attach: author or manager, with the upload right (held by every default
 *   role; the server checks it)
 */
export function noteRights(note, viewer) {
  if (!note || !viewer) {
    return {
      isAuthor: false,
      canEdit: false,
      canPublish: false,
      canPin: false,
      canExemplar: false,
      canSupersede: false,
      canSubmit: false,
      canBackToDraft: false,
      canDelete: false,
      deleteLabel: 'Delete',
      canAttach: false,
    };
  }
  const isAuthor = Boolean(viewer.userId) && note.author_id === viewer.userId;
  const isManager = isManagerRole(viewer.role) || Boolean(viewer.canManage);
  const canApprove = viewer.role === 'executive' || Boolean(viewer.canApprove);
  const status = note.status;
  const live = status !== 'superseded' && status !== 'archived';
  const canEdit = (isAuthor || isManager) && live;
  return {
    isAuthor,
    canEdit,
    canPublish:
      (isAuthor || (isManager && canApprove)) && (status === 'draft' || status === 'under_review'),
    canPin: isAuthor || isManager,
    canExemplar: isManager,
    canSupersede: (isAuthor || isManager) && status === 'published',
    canSubmit: canEdit && status === 'draft',
    canBackToDraft: canEdit && status === 'under_review',
    /* Drafts and documents under review are removed; published or superseded
       work is archived, never removed. Archived work offers neither. */
    canDelete: (isAuthor || isManager) && status !== 'archived',
    deleteLabel: status === 'published' || status === 'superseded' ? 'Archive' : 'Delete',
    canAttach: canEdit,
  };
}

/* ── Publish readiness (the three blockers /publish enforces) ────────────── */

/**
 * The template the publish route checks: one for the document's type. The
 * route takes the first the database returns; the page takes the oldest.
 */
export function templateFor(note, templates) {
  return (templates || []).find((t) => t.doc_type === note?.doc_type) || null;
}

/** Required template sections missing from the body (case-insensitive). */
export function missingSections(note, templates) {
  const t = templateFor(note, templates);
  if (!t || !Array.isArray(t.required_sections)) return { template: t, missing: [] };
  const hay = String(note?.body || '').toLowerCase();
  const missing = t.required_sections
    .map((s) => String(s))
    .filter((s) => s && !hay.includes(s.toLowerCase()));
  return { template: t, missing };
}

/**
 * The readiness checklist: the abstract, the template sections, the open
 * review blocks. `templates` may be null when they could not be loaded; then
 * that line reads as unknown and does not block on the page (the server still
 * checks it).
 */
export function readiness(note, { openBlocks = 0, templates = null } = {}) {
  const items = [];
  const hasAbstract = Boolean(String(note?.abstract || '').trim());
  items.push({
    code: 'abstract_missing',
    ok: hasAbstract,
    label: hasAbstract ? 'Abstract written' : 'Missing abstract',
  });
  if (templates === null) {
    items.push({ code: 'sections_missing', ok: null, label: 'Template sections not checked' });
  } else {
    const { template, missing } = missingSections(note, templates);
    if (template) {
      items.push({
        code: 'sections_missing',
        ok: missing.length === 0,
        label: missing.length
          ? `Missing ${missing.join(', ')} (template "${template.name}")`
          : `Template "${template.name}" sections present`,
      });
    }
  }
  items.push({
    code: 'review_blocks_open',
    ok: openBlocks === 0,
    label:
      openBlocks === 0
        ? 'No open review blocks'
        : `${openBlocks} unresolved review ${openBlocks === 1 ? 'block' : 'blocks'}`,
  });
  return items;
}
export function blockersOf(items) {
  return (items || []).filter((i) => i.ok === false);
}

/* ── Counts, KPIs and shelves ────────────────────────────────────────────── */

/** Files, comments and open review blocks per document id. */
export function countByNote(comments, attachments) {
  const map = new Map();
  const get = (id) => {
    let v = map.get(id);
    if (!v) {
      v = { files: 0, comments: 0, openBlocks: 0 };
      map.set(id, v);
    }
    return v;
  };
  for (const c of comments || []) {
    if (!c?.note_id) continue;
    const v = get(c.note_id);
    v.comments += 1;
    if (c.is_review_block && !c.resolved) v.openBlocks += 1;
  }
  for (const a of attachments || []) {
    if (!a?.note_id) continue;
    get(a.note_id).files += 1;
  }
  return map;
}

/** Rows with file_count, comment_count and open_blocks. */
export function decorate(rows, counts) {
  return (rows || []).map((r) => {
    const c = counts?.get(r.id);
    return {
      ...r,
      file_count: c ? c.files : 0,
      comment_count: c ? c.comments : 0,
      open_blocks: c ? c.openBlocks : 0,
    };
  });
}

/**
 * The library's working set for one viewer: private documents only for the
 * author (the row policy) and drafts only for the author and managers (the
 * search route's rule).
 */
export function visibleRows(rows, { userId, isManager }) {
  return (rows || []).filter((r) => {
    if (r.visibility === 'private' && r.author_id !== userId) return false;
    if (r.status === 'draft' && r.author_id !== userId && !isManager) return false;
    return true;
  });
}

/** KPI strip figures, counted over the viewer's whole working set. */
export function librarySummary(rows, { userId }) {
  let published = 0;
  let underReview = 0;
  let myDrafts = 0;
  let openBlocks = 0;
  for (const r of rows || []) {
    if (r.status === 'published') published += 1;
    if (r.status === 'under_review') underReview += 1;
    if (r.status === 'draft' && r.author_id === userId) myDrafts += 1;
    if (r.status === 'draft' || r.status === 'under_review') openBlocks += r.open_blocks || 0;
  }
  return { published, underReview, myDrafts, openBlocks };
}

function lightRow(r) {
  return {
    id: r.id,
    title: r.title,
    doc_type: r.doc_type,
    ticker: r.ticker || null,
    sector: r.sector || null,
    status: r.status,
    version: r.version || 1,
    term: r.term || null,
    author_id: r.author_id,
    author_name: r.author_name || null,
    pinned: Boolean(r.pinned),
    is_exemplar: Boolean(r.is_exemplar),
    open_blocks: r.open_blocks || 0,
    created_at: r.created_at,
    updated_at: r.updated_at || r.created_at,
    published_at: r.published_at || null,
    is_demo: r.is_demo || undefined,
  };
}
const updatedOf = (r) => new Date(r.updated_at || r.created_at || 0).getTime();

/**
 * Shelves the page shows whatever the search and filters are:
 * - review: everything under review, longest waiting first
 * - mine: the viewer's own drafts and documents under review
 * - exemplars: published documents marked as exemplars, newest first
 */
export function shelves(rows, { userId }) {
  const list = rows || [];
  return {
    review: list
      .filter((r) => r.status === 'under_review')
      .sort((a, b) => updatedOf(a) - updatedOf(b))
      .map(lightRow),
    mine: list
      .filter(
        (r) => r.author_id === userId && (r.status === 'draft' || r.status === 'under_review'),
      )
      .sort((a, b) => updatedOf(b) - updatedOf(a))
      .map(lightRow),
    exemplars: list
      .filter((r) => r.is_exemplar && r.status === 'published')
      .sort((a, b) => updatedOf(b) - updatedOf(a))
      .map(lightRow),
  };
}

/* ── Local search (sample content; mirrors librarySearch) ───────────────── */

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

const DIM = {
  type: 'doc_type',
  sector: 'sector',
  status: 'status',
  term: 'term',
  author: 'author_id',
  ticker: 'ticker',
};

/** Keyword search, the six filters with live counts, pinned first. */
export function searchLocal(rows, q, filters) {
  const query = String(q || '').trim();
  const matched = (rows || []).filter((r) => keywordMatch(r, query));
  const passes = (r, except) =>
    FILTER_KEYS.every((k) => {
      const sel = filters?.[k] || [];
      if (k === except || sel.length === 0) return true;
      const v = k === 'ticker' ? String(r.ticker || '').toUpperCase() : r[DIM[k]];
      return sel.includes(v);
    });
  const facets = {};
  for (const k of FILTER_KEYS) {
    const counts = {};
    for (const r of matched) {
      if (!passes(r, k)) continue;
      const v = r[DIM[k]];
      if (v === null || v === undefined || v === '') continue;
      counts[v] = (counts[v] || 0) + 1;
    }
    facets[k] = counts;
  }
  const notes = matched
    .filter((r) => passes(r, null))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return { notes, facets };
}

/* ── Coverage (mirrors the coverage-lineage and dossier routes) ──────────── */

/**
 * One row per covered ticker: current analyst, handoff count, the latest
 * handoff, document count, last document date, stale flag (no document in
 * 90 days, or none at all), and the latest pitch's expected return.
 */
export function lineageOverview({ notes, hops, pitches, memberName, now = Date.now() }) {
  const by = new Map();
  const row = (key) => {
    let r = by.get(key);
    if (!r) {
      r = {
        ticker: key,
        currentAnalyst: null,
        hops: 0,
        latestHop: null,
        lastDocAt: null,
        docCount: 0,
      };
      by.set(key, r);
    }
    return r;
  };
  const sortedHops = [...(hops || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  for (const h of sortedHops) {
    const key = String(h.ticker || '').toUpperCase();
    if (!key) continue;
    const r = row(key);
    r.hops += 1;
    if (h.to_member_id) r.currentAnalyst = memberName(h.to_member_id);
    r.latestHop = {
      from: h.from_member_id ? memberName(h.from_member_id) : null,
      to: h.to_member_id ? memberName(h.to_member_id) : null,
      term: h.term || null,
      created_at: h.created_at,
      handoff_note_id: h.handoff_note_id || null,
    };
  }
  for (const d of notes || []) {
    const key = String(d.ticker || '').toUpperCase();
    if (!key) continue;
    const r = row(key);
    r.docCount += 1;
    if (!r.lastDocAt || new Date(d.created_at) > new Date(r.lastDocAt)) r.lastDocAt = d.created_at;
  }
  const latestPitch = new Map();
  for (const p of pitches || []) {
    const key = String(p.ticker || '').toUpperCase();
    const prev = latestPitch.get(key);
    if (!prev || new Date(p.created_at) > new Date(prev.created_at)) latestPitch.set(key, p);
  }
  return [...by.values()]
    .map((r) => ({
      ...r,
      stale: r.lastDocAt ? now - new Date(r.lastDocAt).getTime() > STALE_DAYS * DAY : true,
      expected_return_pct: latestPitch.get(r.ticker)?.expected_return_pct ?? null,
    }))
    .sort((a, b) => Number(b.stale) - Number(a.stale) || a.ticker.localeCompare(b.ticker));
}

/** Stale tickers for the side column, longest without a document first. */
export function staleTickers(overview, now = Date.now()) {
  return (overview || [])
    .filter((r) => r.stale)
    .map((r) => ({ ...r, days: daysSince(r.lastDocAt, now) }))
    .sort(
      (a, b) => (b.days ?? Infinity) - (a.days ?? Infinity) || a.ticker.localeCompare(b.ticker),
    );
}

/** The latest handoff per ticker, newest first. */
export function recentHandoffs(overview) {
  return (overview || [])
    .filter((r) => r.latestHop)
    .sort((a, b) => new Date(b.latestHop.created_at) - new Date(a.latestHop.created_at));
}

/**
 * The ticker the side column's quick dossier describes: the ticker filter
 * when exactly one is set, otherwise the ticker with the most documents in
 * the current list (ties: alphabetical).
 */
export function quickDossierTicker(notes, filters) {
  const sel = filters?.ticker || [];
  if (sel.length === 1) return sel[0];
  const counts = new Map();
  for (const n of notes || []) {
    const t = String(n.ticker || '').toUpperCase();
    if (t) counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = null;
  for (const [t, c] of counts) {
    if (!best || c > best.c || (c === best.c && t < best.t)) best = { t, c };
  }
  return best ? best.t : null;
}

/* ── Export ──────────────────────────────────────────────────────────────── */

/* A cell that starts with = + - @ (or a tab or return) would run as a formula
   in a spreadsheet; prefix it with a quote. */
export function csvSafe(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${csvSafe(v).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join(
    '\n',
  );
}
export function exportRows(notes) {
  return (notes || []).map((n) => ({
    Title: cleanTitle(n.title),
    Type: docTypeLabel(n.doc_type),
    Ticker: n.ticker || NA,
    Sector: n.sector || NA,
    Status: statusLabel(n.status),
    Exemplar: n.is_exemplar ? 'Yes' : 'No',
    Pinned: n.pinned ? 'Yes' : 'No',
    Visibility: VISIBILITY_LABEL[n.visibility] || NA,
    Term: n.term || NA,
    Version: n.version || 1,
    Author: n.author_name || NA,
    Files: n.file_count ?? 0,
    Comments: n.comment_count ?? 0,
    Views: n.view_count ?? 0,
    Updated: fmtDate(n.updated_at || n.created_at),
  }));
}
