/**
 * The state a research run's Server-Sent Events fold into (engine v3).
 * Pure and client-safe: the browser's useResearchStream and the research
 * route both use it, so the snapshot an organization saves is exactly what
 * the analyst saw on screen.
 */
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
    case 'coverage':
      return { ...state, coverage: d };
    case 'findings':
      return { ...state, report: d.report, brief: d.brief };
    case 'report':
      return { ...state, run: d };
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
