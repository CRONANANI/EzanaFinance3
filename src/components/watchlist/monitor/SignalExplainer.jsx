'use client';

/**
 * Signal explainer (Market Monitor 2.0, Nov 2026): why the selected item is
 * on the list. Rule facts only: it states what the rule matched and gives no rating
 * or judgement.
 *
 *   Smart item   the stored added reason, the rule name, the matched
 *                conditions with their observed values and the evaluation
 *                time from the event's details (events written before match
 *                details exist show the reason and the added date only), then
 *                the live re-check from useSmartExplain:
 *                  matchesNow true   "Still matches as of {time}"
 *                  matchesNow false  "No longer matches: {condition} is now {observed}"
 *                  null or error     nothing
 *   Manual item  "Added manually" and the monitoring note, or an Add note prompt.
 *
 * The region is aria-live="polite" so a row change is announced once.
 */
import Link from 'next/link';
import { noteHeadline } from '@/lib/watchlist/notes';
import { displayTicker } from '@/lib/watchlist/asset-classes';
import { fmtTime, sonarPrompt } from '@/lib/watchlist/watchlist-view';

const fmtDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * item     the selected row
 * rule     the enabled smart rule for the active list, or null
 * event    the smart event that added this item (from smart.events), or null
 * explain  useSmartExplain() result
 * note     the item's monitoring note, or null
 */
export function SignalExplainer({ item, rule, event, explain, note, onNote, onEditRule }) {
  const label = item ? (item.type === 'politician' ? item.name : displayTicker(item.ticker)) : '';
  const smartAdded = item?.addedBy === 'smart';
  const details = event?.details || null;
  const unmet = (explain?.conditions || []).filter((c) => c.met === false);

  return (
    <section className="wlm-card wlm-explain" aria-labelledby="wlm-explain-h">
      <header className="wlm-card__head">
        <i className="bi bi-bullseye wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-explain-h" className="wlm-card__title">
          Signal explainer
        </h2>
      </header>
      <div className="wlm-explain__body" aria-live="polite">
        {!item ? (
          <p className="wlm-empty">Pick a row to see why it is on this list.</p>
        ) : smartAdded ? (
          <>
            <p className="wlm-explain__lead">
              <i className="bi bi-lightning-charge" aria-hidden="true" />{' '}
              <span className="wlm-strong">{label}</span> was added automatically
              {rule ? (
                <>
                  {' '}
                  by <span className="wlm-strong">{rule.label}</span>
                </>
              ) : null}
              .
            </p>
            {item.addedReason ? <p className="wlm-sm wlm-soft">{item.addedReason}</p> : null}
            {details?.conditions?.length ? (
              <ul className="wlm-explain__conds">
                {details.conditions.map((c) => (
                  <li key={c.description}>
                    <i className="bi bi-check-lg" aria-hidden="true" />
                    <span>
                      {c.description}
                      {c.observed ? <span className="wlm-muted">: {c.observed}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="wlm-xs wlm-muted">
              {details?.evaluatedAt
                ? `Matched ${fmtTime(details.evaluatedAt)}`
                : item.createdAt && fmtDate(item.createdAt)
                  ? `Added ${fmtDate(item.createdAt)}`
                  : null}
            </p>
            {explain?.status === 'ready' && explain.matchesNow === true ? (
              <p className="wlm-explain__now is-yes">
                <i className="bi bi-check-lg" aria-hidden="true" /> Still matches
                {explain.evaluatedAt ? ` as of ${fmtTime(explain.evaluatedAt)}` : ''}
              </p>
            ) : null}
            {explain?.status === 'ready' && explain.matchesNow === false ? (
              <ul className="wlm-explain__now is-no">
                {(unmet.length ? unmet : [{ description: 'the rule', observed: null }]).map((c) => (
                  <li key={c.description}>
                    <i className="bi bi-exclamation-triangle" aria-hidden="true" /> No longer
                    matches: {c.description}
                    {c.observed ? ` is now ${c.observed}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <>
            <p className="wlm-explain__lead">
              <span className="wlm-strong">{label}</span> was added manually.
            </p>
            {note ? (
              <p className="wlm-sm wlm-soft wlm-clamp2">{noteHeadline(note)}</p>
            ) : (
              <p className="wlm-sm wlm-muted">
                No monitoring note yet.{' '}
                <button type="button" className="wlm-link" onClick={onNote}>
                  Add note
                </button>
              </p>
            )}
          </>
        )}
      </div>
      {item ? (
        <div className="wlm-explain__actions">
          <Link
            href={`/sonar?q=${encodeURIComponent(sonarPrompt(item))}`}
            className="wlm-btn wlm-btn--text wlm-btn--sm"
          >
            <i className="bi bi-activity" aria-hidden="true" /> Review in Sonar
          </Link>
          {smartAdded && rule ? (
            <button
              type="button"
              className="wlm-btn wlm-btn--text wlm-btn--sm"
              onClick={() => onEditRule(rule)}
            >
              <i className="bi bi-lightning-charge" aria-hidden="true" /> View matching rule
            </button>
          ) : null}
          <button type="button" className="wlm-btn wlm-btn--text wlm-btn--sm" onClick={onNote}>
            <i className="bi bi-journal-text" aria-hidden="true" />{' '}
            {note ? 'Edit monitoring note' : 'Add monitoring note'}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default SignalExplainer;
