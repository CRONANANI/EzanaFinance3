'use client';

/**
 * useResearchStream: runs a Sonar research query against POST
 * /api/sonar/research and folds the Server-Sent Events into state as they
 * arrive. Every progress state comes from a real server event: nothing here
 * invents progress.
 *
 * State: { status: 'idle'|'running'|'done'|'error'|'gated'|'quota', plan, stage,
 *   tasks: { [id]: { source, status, items } }, panels, memory, evidence,
 *   analysis, relationships, report, brief, run, error, remaining, coverage,
 *   signup, standardAvailable }
 * 'quota' (Nov 2026): today's deep research runs are used; a standard run is
 * still available. `coverage`: a standard run's plan left out evidence the
 * question asked for ({ incomplete, missing, goDeeper }).
 */
import { readControls } from '../research-controls-store';
import { useCallback, useRef, useState } from 'react';
import {
  EMPTY_RESEARCH_STATE as EMPTY,
  parseSseBlock,
  reduceEvent,
} from '@/lib/sonar/research-state';

/* The pure state helpers live in lib/sonar/research-state.js, so the research
   route can fold the same events into the snapshot an org saves. */
export { parseSseBlock, reduceEvent };

export function useResearchStream() {
  const [state, setState] = useState(EMPTY);
  const ctrl = useRef(null);

  const cancel = useCallback(() => {
    ctrl.current?.abort();
  }, []);

  const run = useCallback(async (query, { depth = null, mode = null, extra = null } = {}) => {
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
        body: JSON.stringify({
          query,
          ...(depth ? { depth } : {}),
          ...(mode ? { mode } : {}),
          /* Org research (Nov 2026): { fundFit } or { challenge: { reportId } }. Nov 13: a
             follow-up's { followUp, attachment } too. */
          ...(extra && typeof extra === 'object' ? extra : {}),
          /* Nov 13: Research Controls, sanitized again on the server. */
          controls: readControls(),
        }),
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
        status: body?.gate
          ? 'gated'
          : ['deep_quota', 'org_pool', 'org_allocation'].includes(body?.reason)
            ? 'quota'
            : 'error',
        error: body?.message || body?.error || 'That research run did not start.',
        remaining: body?.remaining ?? null,
        signup: Boolean(body?.signup),
        standardAvailable: Boolean(body?.standardAvailable),
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
