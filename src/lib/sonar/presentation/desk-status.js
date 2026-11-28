/**
 * The Desk Summary for every state of a Sonar research report (Nov 28 2026).
 *
 * Every Sonar Ping opens with a Desk Summary: a finished answer, a running one, a partial or
 * failed one, an unsupported request, and an investment memo alike. The research board builds
 * its own from a finished report; this helper gives the same card to every other state, so no
 * report shape opens with a chart, a memo exhibit or a progress list instead of the answer.
 *
 * It states what was asked, the direct answer or the precise reason there is none, the
 * reporting period, and the qualification that matters. It never invents a conclusion.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-presentation.mjs.
 */

const clean = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * @param {{ status?: string, error?: string, notices?: object[], plan?: object, report?: object,
 *           run?: object, composition?: object }} state  the research stream state
 * -> { status, question, headline, paragraphs: string[], period, qualification, tone }
 *    status: 'running' | 'complete' | 'memo' | 'partial' | 'failed' | 'unsupported'
 */
export function deskStatus(state = {}) {
  const report = state.report || null;
  const run = state.run || null;
  const question = clean(run?.researchQuestion || state.plan?.spec?.question) || null;
  const period =
    clean(report?.period || run?.period || state.plan?.spec?.timeHorizon?.label) || null;
  const limitations = (run?.limitations || []).map(clean).filter(Boolean);
  /* Notices are the stream's plain-text notes ("Showing results for ..."). An unsupported
     request is flagged by the run's fulfillment status (or an object notice of that kind). */
  const notes = (state.notices || []).filter((n) => typeof n === 'string').map(clean);
  const unsupported =
    run?.fulfillment?.status === 'unsupported'
      ? { text: run.fulfillment.reason }
      : (state.notices || []).find((n) => n && typeof n === 'object' && n.kind === 'unsupported');

  if (state.status === 'error')
    return {
      status: 'failed',
      question,
      headline: 'This research could not be completed',
      paragraphs: [
        clean(state.error) ||
          'The research stopped before an answer was produced. No figures are shown that were not verified.',
      ],
      period,
      qualification: limitations[0] || null,
      tone: 'negative',
    };

  if (unsupported)
    return {
      status: 'unsupported',
      question,
      headline: 'Sonar cannot answer this request with its current data',
      paragraphs: [clean(unsupported.text || unsupported.message)].filter(Boolean),
      period,
      qualification: null,
      tone: 'warning',
    };

  if (!report) {
    if (state.status === 'running' || state.status === 'planning' || !state.status)
      return {
        status: 'running',
        question,
        headline: question || 'Researching your question',
        paragraphs: [
          'Sonar is researching this question. The answer appears here when the evidence has been checked.',
        ],
        period,
        qualification: null,
        tone: 'neutral',
      };
    return {
      status: 'partial',
      question,
      headline: 'No verified answer was produced',
      paragraphs: [
        state.composition
          ? 'The composed analysis below ran; the written answer did not complete.'
          : 'The research finished without a conclusion it could support with evidence.',
      ],
      period,
      qualification: limitations[0] || null,
      tone: 'warning',
    };
  }

  const conclusion = clean(report.executiveConclusion?.text);
  const summary = clean(run?.summary || report.summary);
  const headline = clean(run?.headline || report.headline) || null;

  if (report.format === 'investment_memo')
    return {
      status: 'memo',
      question,
      headline: headline || question || 'Investment memo',
      paragraphs: [conclusion || summary || clean(report.view?.text)].filter(Boolean),
      period,
      qualification: limitations[0] || null,
      tone: 'neutral',
    };

  if (!conclusion && !(report.keyFindings || []).length)
    return {
      status: 'partial',
      question,
      headline: headline || 'Partial result',
      paragraphs: [
        summary ||
          'Part of this research completed. What was verified is shown below; what could not be retrieved is listed under limitations.',
      ],
      period,
      qualification: limitations[0] || null,
      tone: 'warning',
    };

  return {
    status: 'complete',
    question,
    headline: headline || question,
    paragraphs: [conclusion || summary].filter(Boolean),
    period,
    qualification: limitations[0] || null,
    tone: 'neutral',
  };
}

/** The status label shown beside the Desk Summary eyebrow. */
export const DESK_STATUS_LABEL = {
  running: 'Researching',
  complete: null,
  memo: 'Investment memo',
  partial: 'Partial result',
  failed: 'Not completed',
  unsupported: 'Not supported',
};
