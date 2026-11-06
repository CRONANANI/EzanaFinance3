/**
 * The state a research run's Server-Sent Events fold into (engine v3).
 * Pure and client-safe: the browser's useResearchStream and the research
 * route both use it, so the snapshot an organization saves is exactly what
 * the analyst saw on screen.
 */
import { ANALYSTS } from './analysts/registry.js';

export const EMPTY_RESEARCH_STATE = {
  status: 'idle',
  plan: null,
  stage: null,
  stages: [],
  tasks: {},
  panels: {},
  memory: null,
  evidence: null,
  analysis: null,
  relationships: null,
  report: null,
  brief: null,
  run: null,
  error: null,
  remaining: null,
  coverage: null,
  signup: false,
  standardAvailable: false,
  /* Set by the done event for an organization member's run: { canSave, runId }. */
  org: null,
  /* Research team (Nov 2026), from real engine events:
     team      the routing decision { mode, lead, supporting, controls }
     analysts  { [id]: { id, title, role, status, seq } }, latest status per analyst
     audit     the methodology checks { passed, total, checks } */
  team: null,
  analysts: {},
  audit: null,
};

const ANALYST_ROLES = new Set(['lead', 'supporting', 'director', 'auditor', 'red-team']);
const ANALYST_STATUS = new Set(['started', 'done', 'failed']);

/** Parse one SSE block ("event: x\ndata: {...}") into [type, data]. */
export function parseSseBlock(block) {
  let type = 'message';
  const data = [];
  for (const line of String(block).split('\n')) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) type = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    return [type, JSON.parse(data.join('\n'))];
  } catch {
    return null;
  }
}

/** Fold one event into state. Pure, so it is testable. */
export function reduceEvent(state, [type, d]) {
  switch (type) {
    case 'plan':
      return { ...state, plan: d };
    case 'stage':
      return { ...state, stage: d.stage, stages: [...state.stages, d.stage] };
    case 'task':
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [d.id]: {
            source: d.source,
            status: d.status,
            items: d.items ?? state.tasks[d.id]?.items ?? null,
          },
        },
      };
    case 'panel':
      return { ...state, panels: { ...state.panels, ...(d.layout || {}) } };
    case 'memory':
      return { ...state, memory: d };
    case 'evidence':
      return { ...state, evidence: d };
    case 'analysis':
      return { ...state, analysis: d };
    case 'relationships':
      return { ...state, relationships: d };
    case 'coverage':
      return { ...state, coverage: d };
    case 'findings':
      return { ...state, report: d.report, brief: d.brief };
    case 'report':
      return { ...state, run: d };
    case 'team':
      return d && typeof d === 'object' ? { ...state, team: d } : state;
    case 'analyst': {
      if (!d?.id || !ANALYST_STATUS.has(d.status)) return state;
      const all = state.analysts || {};
      const prev = all[d.id];
      const seq = Object.values(all).reduce((n, a) => Math.max(n, a.seq || 0), 0) + 1;
      return {
        ...state,
        analysts: {
          ...all,
          [d.id]: {
            id: d.id,
            title: d.title || prev?.title || null,
            role: ANALYST_ROLES.has(d.role) ? d.role : prev?.role || null,
            status: d.status,
            seq,
          },
        },
      };
    }
    case 'audit':
      return d && typeof d === 'object' ? { ...state, audit: d } : state;
    case 'done':
      return { ...state, status: 'done', remaining: d.remaining ?? null, org: d.org ?? null };
    case 'error':
      return {
        ...state,
        status: 'error',
        error: d.message || 'That research run did not complete.',
      };
    default:
      return state;
  }
}

/* ── Research team selectors (Nov 2026) ─────────────────────────────────────
   The UI reads the team through these, so the run screen and the report agree.
   Titles only ever come from the event, the final report or the registry: an
   internal id is never returned as display text. */

/** Display title for an analyst entry; never the id. */
export function analystTitle(a) {
  return a?.title || ANALYSTS[a?.id]?.title || 'Specialist analyst';
}

const LIVE_STATUS = { started: 'active', done: 'done', failed: 'failed' };

/** Live step status for an analyst id: pending | active | done | failed. */
function liveStatus(state, id) {
  return LIVE_STATUS[state?.analysts?.[id]?.status] || 'pending';
}

function byRole(state, role) {
  return Object.values(state?.analysts || {}).find((a) => a.role === role) || null;
}

/**
 * The run screen's team progress, from real events only.
 * Returns null before the routing decision arrives (and for quick runs).
 * { mode, lead: { id, title, reason, status } | null, supporting: [...],
 *   redTeam: null | status, audit: null | status, auditResult: { passed, total } | null,
 *   afterSynthesis: boolean (a control step after the director's draft has started) }
 */
export function teamProgress(state) {
  const team = state?.team || null;
  const audit = state?.audit || null;
  if (!team && !audit) return null;
  if (team?.mode === 'quick' && !audit) return null;
  const person = (p, role) =>
    p?.id
      ? {
          id: p.id,
          role,
          title: analystTitle(p),
          reason: p.reason || null,
          status: liveStatus(state, p.id),
        }
      : null;
  const lead = team ? person(team.lead, 'lead') : null;
  const supporting = (team?.supporting || []).map((p) => person(p, 'supporting')).filter(Boolean);
  /* A specialist the director added on a handoff (deep research) reports
     through analyst events without being in the routing decision. */
  const routed = new Set([lead?.id, ...supporting.map((p) => p.id)]);
  for (const a of Object.values(state?.analysts || {}).sort((x, y) => x.seq - y.seq)) {
    if ((a.role === 'supporting' || a.role === 'lead') && !routed.has(a.id))
      supporting.push(person(a, 'supporting'));
  }
  const rtEntry = byRole(state, 'red-team') || state?.analysts?.['red-team'] || null;
  const hasRedTeam = Boolean(team?.controls?.includes('red-team') || rtEntry);
  const redTeam = hasRedTeam ? LIVE_STATUS[rtEntry?.status] || 'pending' : null;
  const auditor = byRole(state, 'auditor') || state?.analysts?.['methodology-auditor'] || null;
  const auditStatus = audit
    ? 'done'
    : auditor
      ? auditor.status === 'started'
        ? 'active'
        : auditor.status === 'done'
          ? 'done'
          : 'failed'
      : 'pending';
  return {
    mode: team?.mode || null,
    lead,
    supporting,
    redTeam,
    audit: team || audit ? auditStatus : null,
    auditResult: audit
      ? { passed: Number(audit.passed) || 0, total: Number(audit.total) || 0 }
      : null,
    afterSynthesis: Boolean((redTeam && redTeam !== 'pending') || auditStatus !== 'pending'),
  };
}

/**
 * The report's research team: the final report.team when the run is done,
 * else the live routing decision with each analyst's status so far.
 * Returns null for quick runs and runs with no team (older reports).
 */
export function selectTeam(state) {
  const final = state?.run?.team || null;
  const live = state?.team || null;
  const src = final || live;
  if (!src || src.mode === 'quick') return null;
  const people = [
    ...(src.lead?.id ? [{ ...src.lead, role: 'lead' }] : []),
    ...(src.supporting || []).filter((p) => p?.id).map((p) => ({ ...p, role: 'supporting' })),
  ];
  const finished = Array.isArray(final?.specialists) && final.specialists.length;
  const specialists = finished
    ? [...final.specialists].sort(
        (a, b) => (a.role === 'lead' ? -1 : 0) - (b.role === 'lead' ? -1 : 0),
      )
    : people.map((p) => {
        const st = liveStatus(state, p.id);
        return {
          id: p.id,
          title: p.title,
          role: p.role,
          reason: p.reason || null,
          status:
            st === 'done'
              ? 'done'
              : st === 'failed'
                ? 'missing'
                : st === 'active'
                  ? 'working'
                  : 'waiting',
          conclusion: null,
          confidence: null,
          findings: [],
        };
      });
  return {
    mode: src.mode || null,
    live: !final,
    specialists: specialists.map((sp) => ({
      ...sp,
      title: analystTitle(sp),
      reason: sp.reason || people.find((p) => p.id === sp.id)?.reason || null,
      findings: Array.isArray(sp.findings) ? sp.findings : [],
    })),
    audit: final?.audit || state?.audit || null,
    redTeam: final?.redTeam || null,
    methodology: final?.methodology || null,
  };
}

/** Split a finding's refs into evidence markers (S3) and metric ids (from M:x). */
export function splitRefs(refs) {
  const evidence = [];
  const metrics = [];
  for (const r of Array.isArray(refs) ? refs : []) {
    const v = String(r || '')
      .replace(/[[\]]/g, '')
      .trim();
    if (/^S\d+$/.test(v)) evidence.push(v);
    else if (/^M:.+/.test(v)) metrics.push(v.slice(2));
  }
  return { evidence, metrics };
}
