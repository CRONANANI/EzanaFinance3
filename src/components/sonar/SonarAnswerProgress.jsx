'use client';

/**
 * An answer in progress (Nov 2026, estimates): "Researching your question ·
 * about 10 to 20 seconds", a live elapsed clock and the planned stages
 * (Understanding, Reading Ezana datasets, Reading macro data, Writing the
 * brief), with the deep research card beside it on desktop and below it on
 * mobile (`aside`). Replaces the Pulse loader while a ping sweeps; the
 * Pulse loader still shows a failed ping's error state.
 *
 * Honest progress: a ping is one request with no stage events, so the
 * stages advance on a schedule proportional to the estimate and the last
 * one holds until the answer lands (answerStage in estimate-copy.js). Only
 * phase 'ready' marks every stage done.
 *
 * Accessibility: one polite status region announces stage changes (never
 * the clock, which is aria-hidden); Cancel takes focus and Escape cancels;
 * the estimate and the slow notice have reserved space, so nothing moves
 * when they arrive.
 *
 * Branding guide: tokens only, prefix `snra-`, motion off under
 * prefers-reduced-motion. No em dashes in copy.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { VisuallyHidden } from '@/components/ds';
import { ANSWER_STAGES, answerStage } from '@/lib/sonar/estimate-copy';
import './sonar-answer-progress.css';

function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {string} [props.entityLabel]
 * @param {{ minSec: number, maxSec: number, label: string }|null} props.estimate  the answer estimate
 * @param {'sweeping'|'ready'} [props.phase]
 * @param {boolean} [props.leaving]  fades out before it unmounts
 * @param {() => void} [props.onCancel]
 * @param {import('react').ReactNode} [props.aside]  the deep research card
 */
export function SonarAnswerProgress({
  entityLabel = '',
  estimate = null,
  phase = 'sweeping',
  leaving = false,
  onCancel = null,
  aside = null,
}) {
  const titleId = useId();
  const cancelRef = useRef(null);
  const t0 = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const sweeping = phase === 'sweeping';

  /* The nav takes the loader's ground while this is up (nav-sonar-dark.css),
     as it does for the Pulse loader. Left on if a Pulse loader is mounted. */
  useEffect(() => {
    document.body.classList.add('sonar-ping-active');
    return () => {
      if (!document.querySelector('.snrp')) document.body.classList.remove('sonar-ping-active');
    };
  }, []);

  useEffect(() => {
    if (!sweeping) return undefined;
    t0.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed((Date.now() - t0.current) / 1000), 1000);
    return () => clearInterval(id);
  }, [sweeping]);

  useEffect(() => {
    if (sweeping) cancelRef.current?.focus({ preventScroll: true });
  }, [sweeping]);

  useEffect(() => {
    if (!sweeping || !onCancel) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sweeping, onCancel]);

  const stage = answerStage(elapsed, estimate, { phase });
  const slow = sweeping && elapsed > (Number(estimate?.maxSec) || 20) + 5;
  const announce = stage.complete
    ? 'Brief ready'
    : `${stage.label}${slow ? '. Taking longer than usual. Still working.' : ''}`;

  return (
    <div className={`snra force-dark-theme${leaving ? ' is-leaving' : ''}`}>
      <div className={`snra-grid${aside ? ' snra-grid--aside' : ''}`}>
        <section className="snra-panel" aria-labelledby={titleId}>
          <div className="snra-head">
            <span className="snra-pulse" aria-hidden="true">
              <span className="snra-ring" />
              <span className="snra-core" />
            </span>
            {entityLabel ? <span className="snra-entity">{entityLabel}</span> : null}
          </div>
          <h2 id={titleId} className="snra-title">
            {stage.complete ? 'Your brief is ready' : 'Researching your question'}
            <span className="snra-est">
              {estimate?.label && !stage.complete ? ` · ${estimate.label}` : ''}
            </span>
          </h2>
          <p className="snra-clock" aria-hidden="true">
            <span className="snra-clock-num">{clock(elapsed)}</span> elapsed
          </p>
          <ol className="snra-stages" aria-label="Research stages">
            {ANSWER_STAGES.map((name, i) => {
              const st =
                stage.complete || i < stage.index
                  ? 'done'
                  : i === stage.index
                    ? 'active'
                    : 'queued';
              return (
                <li
                  key={name}
                  className={`snra-stage is-${st}`}
                  aria-current={st === 'active' ? 'step' : undefined}
                >
                  <span className="snra-mark" aria-hidden="true">
                    {st === 'done' ? <i className="bi bi-check2" /> : null}
                  </span>
                  <span>{name}</span>
                  <VisuallyHidden>
                    {st === 'done' ? ', done' : st === 'active' ? ', in progress' : ', next'}
                  </VisuallyHidden>
                </li>
              );
            })}
          </ol>
          <p className="snra-slow">{slow ? 'Taking longer than usual. Still working.' : ''}</p>
          <VisuallyHidden as="p" role="status" aria-live="polite" aria-atomic="true">
            {announce}
          </VisuallyHidden>
          {sweeping && onCancel ? (
            <div className="snra-actions">
              <button ref={cancelRef} type="button" className="snra-cancel" onClick={onCancel}>
                Cancel
              </button>
            </div>
          ) : null}
        </section>
        {aside ? <div className="snra-aside">{aside}</div> : null}
      </div>
    </div>
  );
}

export default SonarAnswerProgress;
