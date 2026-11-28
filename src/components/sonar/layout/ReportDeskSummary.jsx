'use client';

/**
 * ReportDeskSummary (Nov 28 2026): the Desk Summary for every research report state the
 * research board does not build itself: a run still in progress, an investment memo, a
 * partial, failed or unsupported result. Same card as every other Sonar answer
 * (SonarDeskSummary), filled from deskStatus(), so every Sonar Ping opens with the answer, or
 * the precise reason there is none, directly under the composer and the follow-ups.
 */
import { SonarDeskSummary } from '@/components/sonar/SonarDeskSummary';
import { deskStatus, DESK_STATUS_LABEL } from '@/lib/sonar/presentation/desk-status';
import { deskSourceRows } from '@/lib/sonar/desk-summary';

const TONE_ICON = {
  negative: 'bi-x-octagon',
  warning: 'bi-exclamation-triangle',
  neutral: 'bi-info-circle',
};

export function ReportDeskSummary({ state, resources = [], actions = null }) {
  const s = deskStatus(state);
  const label = DESK_STATUS_LABEL[s.status];
  const depth = state?.plan?.spec?.depth;
  const notice =
    label || s.qualification ? (
      <p className="sds-notice" role={s.status === 'failed' ? 'alert' : undefined}>
        <i className={`bi ${TONE_ICON[s.tone] || TONE_ICON.neutral}`} aria-hidden="true" />{' '}
        {[label, s.qualification].filter(Boolean).join(': ')}
      </p>
    ) : null;
  return (
    <SonarDeskSummary
      mode={depth === 'deep' ? 'deep' : depth === 'quick' ? 'quick' : 'standard'}
      answeredAt={state?.run?.answeredAt || null}
      notice={notice}
      subhead={s.question && s.headline !== s.question ? s.question : null}
      headline={s.headline}
      question={s.question}
      summary={s.paragraphs}
      meta={s.period ? [s.period] : []}
      actions={actions}
      sources={deskSourceRows(resources)}
      sourceCount={resources.length}
    />
  );
}

export default ReportDeskSummary;
