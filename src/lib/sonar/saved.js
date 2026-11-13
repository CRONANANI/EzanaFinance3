// src/lib/sonar/saved.js
// Saved research, the research library and share links (Sonar research workspace, Nov 13
// 2026): the pure rules the routes and the client share. No I/O; tested in
// scripts/check-sonar-saved.mjs. The tables are in
// supabase/migrations/20261118090000_sonar_research_workspace.sql.

import { sanitizeControls } from './research-controls.js';
import { savedTitle } from './workspace.js';

/* The migration's check: octet_length(snapshot::text) <= 600000. */
export const SAVED_SNAPSHOT_MAX_BYTES = 600000;
export const SAVED_MAX = 500;
export const COLLECTIONS_MAX = 50;
export const HISTORY_PAGE = 30;
export const SAVED_PAGE = 100;

export const SAVED_KINDS = new Set(['ping', 'research']);
const DEPTHS = new Set(['quick', 'standard', 'deep']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/**
 * Keys a saved snapshot never keeps, at any depth: who the reader is, their plan and quota,
 * their organization, and the contents of a file they attached. (`plan` is the research
 * plan of a run, not a subscription, so it stays.)
 */
export const PRIVATE_KEYS = new Set([
  'user',
  'userId',
  'user_id',
  'email',
  'owner',
  'planTier',
  'plan_tier',
  'tier',
  'quota',
  'remaining',
  'signup',
  'orgId',
  'org_id',
  'org',
  'seat',
  'attachment',
  'attachmentText',
  'attachment_text',
  'ipHash',
  'ip_hash',
]);

/** A copy of `value` without any PRIVATE_KEYS, at any depth (bounded). */
export function stripPrivate(value, depth = 0) {
  if (depth > 24 || value == null) return value ?? null;
  if (Array.isArray(value)) return value.map((v) => stripPrivate(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(k)) continue;
    out[k] = stripPrivate(v, depth + 1);
  }
  return out;
}

export const snapshotBytes = (s) => {
  const text = JSON.stringify(s ?? {});
  return typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(text).length
    : text.length * 2;
};

const str = (v, max) =>
  typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null;

/**
 * Validate a save request. -> { ok: true, row } | { ok: false, status, error }
 * The row has no user_id: the route adds the caller's own.
 */
export function cleanSaveBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const kind = SAVED_KINDS.has(b.kind) ? b.kind : null;
  if (!kind) return { ok: false, status: 400, error: 'Unknown kind of research.' };
  const question = str(b.question, 600);
  if (!question) return { ok: false, status: 400, error: 'A saved answer needs its question.' };
  if (b.runId != null && !isUuid(b.runId))
    return { ok: false, status: 400, error: 'Unknown research run.' };
  if (b.parentId != null && !isUuid(b.parentId))
    return { ok: false, status: 400, error: 'Unknown saved item.' };
  if (kind === 'research' && !b.runId)
    return { ok: false, status: 400, error: 'A research run is needed to save it.' };
  if (!b.snapshot || typeof b.snapshot !== 'object' || Array.isArray(b.snapshot))
    return { ok: false, status: 400, error: 'Nothing to save.' };
  const snapshot = stripPrivate(b.snapshot);
  if (snapshotBytes(snapshot) > SAVED_SNAPSHOT_MAX_BYTES)
    return { ok: false, status: 413, error: 'This answer is too large to save.' };
  const tickerRaw = str(b.ticker, 12);
  const ticker = tickerRaw && /^[A-Za-z0-9.-]+$/.test(tickerRaw) ? tickerRaw.toUpperCase() : null;
  return {
    ok: true,
    row: {
      kind,
      run_id: b.runId || null,
      parent_id: b.parentId || null,
      question,
      title: savedTitle({ headline: str(snapshot.headline, 300), question }),
      subject: str(b.subject, 160),
      ticker,
      depth: DEPTHS.has(b.depth) ? b.depth : null,
      controls: sanitizeControls(b.controls),
      snapshot,
    },
  };
}

/** A folder name: 1 to 60 characters after trimming, or null. */
export function cleanCollectionName(v) {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return s.length >= 1 && s.length <= 60 ? s : null;
}

/** A saved item's PATCH: only title, note, collectionId and share. -> { ok, patch, share } */
export function cleanSavedPatch(body) {
  const b = body && typeof body === 'object' ? body : {};
  const patch = {};
  if ('title' in b) {
    const t = str(b.title, 160);
    if (!t) return { ok: false, error: 'A title needs 1 to 160 characters.' };
    patch.title = t;
  }
  if ('note' in b) {
    if (b.note != null && typeof b.note !== 'string') return { ok: false, error: 'Invalid note.' };
    patch.note = b.note ? String(b.note).slice(0, 2000) : null;
  }
  if ('collectionId' in b) {
    if (b.collectionId != null && !isUuid(b.collectionId))
      return { ok: false, error: 'Unknown folder.' };
    patch.collection_id = b.collectionId || null;
  }
  const share = typeof b.share === 'boolean' ? b.share : null;
  if (!Object.keys(patch).length && share == null)
    return { ok: false, error: 'Nothing to change.' };
  return { ok: true, patch, share };
}

/** Organization and partner seats share through their organization's workflow, never a link. */
export const seatCanShare = (version) => version !== 'org' && version !== 'partner';

/** The public link for a share token. */
export const shareHref = (token) => `/sonar/shared/${token}`;

/** A missing table or function (the migration is not applied yet). */
export const notMigrated = (error) =>
  Boolean(error) &&
  (error.code === '42P01' ||
    error.code === '42883' ||
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(error.message || ''));

/* ── client-side snapshot builders ─────────────────────────────────────── */

/**
 * The public part every snapshot carries at its top level (the share link reads only these,
 * through publicSnapshot): question, headline, summary, takeaways, sources, depth, answeredAt.
 */
export function deskFields({
  question,
  headline = null,
  summary = null,
  takeaways = [],
  sources = [],
  depth = null,
  answeredAt = null,
}) {
  return {
    question: question || null,
    headline: headline || null,
    summary: summary || null,
    takeaways: (takeaways || []).filter(Boolean).slice(0, 5),
    sources: (sources || [])
      .filter((s) => s && s.name)
      .slice(0, 40)
      .map((s) => ({ name: s.name, url: s.external && s.href ? s.href : null })),
    depth: DEPTHS.has(depth) ? depth : null,
    answeredAt: answeredAt || null,
  };
}

/**
 * A research run's snapshot under the size cap: the folded state (snapshotFromState), then,
 * if it is still too large, without the dataset panels, the relationships and the evidence
 * texts, in that order. -> { snapshot, trimmed: string[] } or null when nothing fits.
 */
export function fitSnapshot(snapshot) {
  if (!snapshot) return null;
  let s = stripPrivate(snapshot);
  const trimmed = [];
  const steps = [
    ['panels', (x) => ({ ...x, panels: {} })],
    ['relationships', (x) => ({ ...x, relationships: null })],
    [
      'evidence texts',
      (x) => ({
        ...x,
        run: x.run
          ? {
              ...x.run,
              evidence: (x.run.evidence || []).map((e) => ({ ...e, text: undefined })),
            }
          : x.run,
        evidence: null,
      }),
    ],
  ];
  for (const [label, step] of steps) {
    if (snapshotBytes(s) <= SAVED_SNAPSHOT_MAX_BYTES) break;
    s = step(s);
    trimmed.push(label);
  }
  if (snapshotBytes(s) > SAVED_SNAPSHOT_MAX_BYTES) return null;
  return { snapshot: trimmed.length ? { ...s, trimmed } : s, trimmed };
}

/**
 * The state ResearchReport renders for one of the reader's past runs (sonar_research_runs):
 * the stored report text, its evidence and metrics. A personal run keeps no charts, so a past
 * run opens without them; a saved copy keeps the full answer.
 */
export function stateFromRunRow(row) {
  if (!row?.report) return null;
  const r = row.report || {};
  const subject =
    row.subject && typeof row.subject === 'object'
      ? row.subject
      : row.subject
        ? { label: String(row.subject) }
        : null;
  const metrics = Array.isArray(r.metrics) ? r.metrics : [];
  return {
    status: 'done',
    plan: {
      runId: row.id,
      spec: { question: row.question, depth: row.depth || 'standard', subject },
    },
    stage: null,
    stages: [],
    tasks: {},
    panels: {},
    memory: null,
    evidence: null,
    analysis: { metrics, visualizations: [] },
    relationships: null,
    report: {
      executiveConclusion: r.executiveConclusion || null,
      keyFindings: r.keyFindings || [],
      analysis: r.analysis || [],
      limitations: r.limitations || [],
      confidence: r.confidence || null,
    },
    brief: null,
    run: {
      runId: row.id,
      researchQuestion: row.question,
      researchScope: { depth: row.depth || 'standard', subject },
      evidence: Array.isArray(r.evidence) ? r.evidence : [],
      quantitativeMetrics: metrics,
      limitations: r.limitations || [],
      confidence: r.confidence || null,
      methodology: { plan: row.plan || null },
      researchMetadata: row.created_at
        ? { startedAt: row.created_at, durationMs: row.duration_ms ?? 0 }
        : null,
    },
    error: null,
    remaining: null,
    coverage: null,
    signup: false,
    standardAvailable: false,
    org: null,
  };
}
