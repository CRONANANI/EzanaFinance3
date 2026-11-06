'use client';

/**
 * Sonar research loading state (Nov 2026, Claude Design handoff): the screen
 * a ping shows from submit until the brief is ready. One animated 3D cube
 * with a seven-colour network inside it (one colour per Ezana data
 * dimension), the seven dimensions with a one-word status each, a rotating
 * phrase, the clock and Cancel. Replaces SonarAnswerProgress on the ping
 * screen; a failed ping still shows the Pulse loader's error state.
 *
 * Kept from the screen it replaces: the ping's time estimate beside the
 * clock (and it paces the simulated statuses), the "taking longer than
 * usual" notice, the deep research card (`aside`, under the dimensions on
 * desktop, at the end on smaller screens), Escape cancels, Cancel takes
 * focus, and the nav takes the loader's ground (body.sonar-ping-active).
 *
 * Honest progress: nothing shows Complete until the answer has arrived
 * (`isComplete`). Then the dimensions flip to Complete, the core flares, the
 * state fades, and `onExited` tells the page to show the brief. A ping that
 * settles without a brief (`dismissed`) fades quietly, never "ready".
 *
 * Branding guide: tokens only, page-scoped under .sonar-loading, Bootstrap
 * Icons, always dark (force-dark-theme), no em dashes in copy, findings
 * only.
 */
import { useEffect, useRef } from 'react';
import SonarCube from './SonarCube';
import { useSonarProgress } from './useSonarProgress';
import { STATUS_LABELS, TICKER_PHRASES } from './dimensions';
import './sonar-loading.css';

function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {string} props.query                    the ping, shown verbatim
 * @param {boolean} [props.isComplete]            the brief has arrived: play the hand-off
 * @param {boolean} [props.dismissed]             settled without a brief: fade quietly
 * @param {object} [props.events]                 optional real progress (useSonarProgress)
 * @param {{ minSec: number, maxSec: number, label: string }|null} [props.estimate]
 * @param {() => void} [props.onCancel]           abort the ping
 * @param {() => void} [props.onExited]           the hand-off finished: show the result
 * @param {import('react').ReactNode} [props.aside]  the deep research card
 */
export default function SonarLoadingState({
  query,
  isComplete = false,
  dismissed = false,
  events = null,
  estimate = null,
  onCancel = null,
  onExited = null,
  aside = null,
}) {
  const { elapsedMs, phase, stage, focus, dimensions, phraseIndex, completed } = useSonarProgress({
    isComplete,
    dismissed,
    events,
    estimate,
  });
  const cancelRef = useRef(null);
  const running = phase === 'running';

  useEffect(() => {
    if (phase === 'done') onExited?.();
  }, [phase, onExited]);

  /* The nav takes the loader's ground while this is up (nav-sonar-dark.css),
     as it does for the Pulse loader. Left on if a Pulse loader is mounted. */
  useEffect(() => {
    document.body.classList.add('sonar-ping-active');
    return () => {
      if (!document.querySelector('.snrp')) document.body.classList.remove('sonar-ping-active');
    };
  }, []);

  useEffect(() => {
    if (running) cancelRef.current?.focus({ preventScroll: true });
  }, [running]);

  useEffect(() => {
    if (!running || !onCancel) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, onCancel]);

  const done = dimensions.filter((d) => d.status === 'complete').length;
  const slow = running && elapsedMs / 1000 > (Number(estimate?.maxSec) || 20) + 5;
  const ticker = completed
    ? 'Your research brief is ready'
    : slow
      ? 'Taking longer than usual. Still working.'
      : TICKER_PHRASES[phraseIndex];

  return (
    <div
      className={`sonar-loading force-dark-theme${phase === 'exiting' || phase === 'done' ? ' is-exiting' : ''}`}
      aria-busy={running}
    >
      <div className="sl-inner">
        <div className="sl-topbar">
          {estimate?.label && running ? (
            <span className="sl-estimate">{estimate.label}</span>
          ) : null}
          <span className="sl-clock" aria-label={`Elapsed ${formatClock(elapsedMs)}`}>
            <span className="sl-live-dot" aria-hidden="true" />
            {formatClock(elapsedMs)}
          </span>
          {onCancel ? (
            <button
              ref={cancelRef}
              type="button"
              className="sl-cancel"
              onClick={onCancel}
              disabled={!running}
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="sl-query">
          <i className="bi bi-search" aria-hidden="true" />
          <p>{query}</p>
        </div>

        <div className="sl-body">
          <section className="sl-engine" aria-label="Sonar research engine">
            <SonarCube active={focus} stage={stage} complete={completed} />
            <div className="sl-ticker" aria-live="polite">
              <span
                key={completed ? 'ready' : slow ? 'slow' : phraseIndex}
                className="sl-ticker__phrase"
              >
                {ticker}
              </span>
            </div>
          </section>

          <div className="sl-side">
            <section className="sl-dims" aria-label={`Data dimensions, ${done} of 7 complete`}>
              {dimensions.map((d) => (
                <div
                  key={d.key}
                  className="sl-dim"
                  data-focused={d.isFocused ? 'true' : undefined}
                  data-status={d.status}
                  style={{ '--dim-color': `var(${d.colorVar})` }}
                >
                  <span className="sl-dim__dot" aria-hidden="true" />
                  <span className="sl-dim__name">{d.name}</span>
                  <span className="sl-dim__status">
                    {d.status === 'complete' ? (
                      <i className="bi bi-check2" aria-hidden="true" />
                    ) : null}
                    {STATUS_LABELS[d.status]}
                  </span>
                  <span className="sl-dim__bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(d.progress * 100)}%` }} />
                  </span>
                </div>
              ))}
            </section>
            {aside && running ? <div className="sl-aside">{aside}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
