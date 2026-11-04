'use client';

/**
 * useResearchStream: runs a Sonar research query against POST
 * /api/sonar/research and folds the Server-Sent Events into state as they
 * arrive. Every progress state comes from a real server event: nothing here
 * invents progress.
 *
 * State: { status: 'idle'|'running'|'done'|'error'|'gated', plan, stage,
 *   tasks: { [id]: { source, status, items } }, panels, memory, evidence,
 *   analysis, relationships, report, brief, run, error, remaining }
 */
import { useCallback, useRef, useState } from 'react';

const EMPTY = {
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
};

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
    case 'findings':
      return { ...state, report: d.report, brief: d.brief };
    case 'report':
      return { ...state, run: d };
    case 'done':
      return { ...state, status: 'done', remaining: d.remaining ?? null };
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

export function useResearchStream() {
  const [state, setState] = useState(EMPTY);
  const ctrl = useRef(null);

  const cancel = useCallback(() => {
    ctrl.current?.abort();
  }, []);

  const run = useCallback(async (query, { depth = null } = {}) => {
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    setState({ ...EMPTY, status: 'running' });
    let res;
    try {
      res = await fetch('/api/sonar/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, ...(depth ? { depth } : {}) }),
        signal: ac.signal,
      });
    } catch {
      if (!ac.signal.aborted)
        setState((s) => ({
          ...s,
          status: 'error',
          error: 'That research run did not start. Try again.',
        }));
      return;
    }
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/event-stream')) {
      const body = await res.json().catch(() => ({}));
      setState((s) => ({
        ...s,
        status: body?.gate ? 'gated' : 'error',
        error: body?.message || body?.error || 'That research run did not start.',
        remaining: body?.remaining ?? null,
      }));
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const ev = parseSseBlock(buf.slice(0, cut));
          buf = buf.slice(cut + 2);
          if (!ev) continue;
          setState((s) => reduceEvent(s, ev));
          /* A failed run hands back a refund token; return the guest's ping. */
          if (ev[0] === 'error' && ev[1]?.refund && ev[1]?.runId) {
            fetch('/api/sonar/research/refund', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ runId: ev[1].runId, token: ev[1].refund }),
            }).catch(() => {});
          }
        }
      }
    } catch {
      if (ac.signal.aborted) {
        setState((s) => ({ ...s, status: 'error', error: 'Research cancelled.' }));
      } else {
        setState((s) => ({
          ...s,
          status: s.run ? 'done' : 'error',
          error: s.run ? null : 'The connection dropped before the report finished.',
        }));
      }
    }
  }, []);

  return { state, run, cancel };
}

/** Send feedback on a run or a finding. Resolves true when stored. */
export async function sendFeedback(body) {
  try {
    const r = await fetch('/api/sonar/research/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch {
    return false;
  }
}
