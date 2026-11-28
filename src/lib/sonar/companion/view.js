/**
 * Sonar Companion: one normalized view of a research result for every presentation mode
 * (Nov 28 2026).
 *
 * The compact widget, the sidebar and the full Sonar workspace all read the same result.
 * viewFromResearch() normalizes a research stream state (or a stored run); viewFromCouncil()
 * normalizes a council answer. The modes differ only in how much they show (limits), never in
 * the values: a metric in the compact card is the same object, formatted by the same
 * function, as in the sidebar and the full report.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-companion.mjs.
 */
import { formatFigure } from '@/lib/sonar/presentation/contracts';

export const MODE_LIMITS = {
  compact: { findings: 3, metrics: 2, visuals: 0, citations: 3 },
  sidebar: { findings: 8, metrics: 6, visuals: 4, citations: 12 },
  full: { findings: Infinity, metrics: Infinity, visuals: Infinity, citations: Infinity },
};

/* The evidence event carries { retrieved, selected: [...] }; a stored run may carry a list. */
const evidenceList = (ev) =>
  (Array.isArray(ev)
    ? ev
    : Array.isArray(ev?.selected)
      ? ev.selected
      : Array.isArray(ev?.items)
        ? ev.items
        : []
  ).filter((e) => e && (e.id || e.title));

const fmtMetric = (m) => ({
  id: m.id || m.label,
  label: m.label,
  value: m.value ?? null,
  unit: m.unit || null,
  text: formatFigure(m.value, m.unit),
});

export function viewFromResearch(state) {
  if (!state) return null;
  const report = state.report || state.draft?.report || null;
  const run = state.run || null;
  const conclusion = report?.executiveConclusion?.text || run?.summary || report?.summary || null;
  return {
    kind: 'research',
    status: state.status,
    runId: state.runId || state.plan?.runId || null,
    question: state.plan?.spec?.question || null,
    headline: run?.headline || report?.headline || null,
    summary: conclusion,
    findings: (report?.keyFindings || [])
      .map((f) => ({
        id: f.id,
        text: f.text || f.claim || '',
        markers: f.markers || f.evidenceIds || [],
      }))
      .filter((f) => f.text),
    metrics: (state.analysis?.metrics || []).map(fmtMetric),
    visuals: state.analysis?.visualizations || [],
    citations: evidenceList(state.evidence).map((e) => ({
      id: e.id,
      title: e.title || e.label || e.source || 'Source',
      url: e.url || null,
    })),
    error: state.error || null,
    gated: state.status === 'gated' || state.status === 'quota',
    remaining: state.remaining ?? null,
  };
}

export function viewFromCouncil(data) {
  const r = data?.result;
  if (!r) return null;
  return {
    kind: 'council',
    status: 'done',
    runId: null,
    capability: r.capability,
    question: null,
    headline: r.desk?.headline || null,
    summary: (r.desk?.paragraphs || []).join(' ') || null,
    qualification: r.desk?.qualification || null,
    hypothetical: Boolean(r.hypothetical),
    findings: [],
    metrics: [],
    visuals: r.visuals || [],
    citations: (r.evidence || []).map((e) => ({ id: e.id, title: e.label, url: null })),
    limitations: r.limitations || [],
    proposals: r.proposals || [],
    error: null,
    gated: false,
  };
}

/** The slice a mode shows. Same objects, fewer of them. */
export function forMode(view, mode = 'compact') {
  if (!view) return null;
  const l = MODE_LIMITS[mode] || MODE_LIMITS.compact;
  return {
    ...view,
    findings: view.findings.slice(0, l.findings),
    metrics: view.metrics.slice(0, l.metrics),
    visuals: view.visuals.slice(0, l.visuals),
    citations: view.citations.slice(0, l.citations),
    more:
      view.findings.length > l.findings ||
      view.visuals.length > l.visuals ||
      view.citations.length > l.citations,
  };
}

/**
 * The full-screen handoff: a stable address for the stored run (never the report payload in
 * the URL), or the council tab for a council answer.
 */
export function fullScreenHref(view) {
  if (!view) return '/sonar';
  if (view.kind === 'council') return '/org-team-hub/sonar?tab=intelligence';
  return view.runId ? `/sonar/history/${encodeURIComponent(view.runId)}` : '/sonar';
}
