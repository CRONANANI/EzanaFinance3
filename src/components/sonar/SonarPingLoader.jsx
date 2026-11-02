'use client';

/**
 * Sonar's ping loading screen, "Pulse" (Nov 2, sonar-loading handoff).
 * Replaces the Oct 29 rail loader (seven icons on a bus under the bouncing
 * stack). One quiet screen: an emerald sonar pulse, the entity, the
 * dimension being swept, seven progress dots and Cancel. Nothing else.
 *
 * Progress is honest. The ping is one request with no per-dimension events
 * (/api/sonar/landing-query answers once, inside six seconds), so the status
 * line walks the dimension names on the ring's rhythm (2.1s each) and the
 * dots fill on the same timer, but the last dot never fills and the line
 * holds on "Writing your briefing" until the answer lands. Only `phase:
 * 'ready'` shows 7/7 and "Briefing ready".
 *
 * Props
 *   entityLabel  short entity or subject (pingEntityLabel), shown uppercase
 *   dimensions   [{ id, name }] in sweep order; defaults to the taxonomy
 *   phase        'sweeping' | 'ready' | 'error' | 'loading' (route loading:
 *                the pulse and a status line only, no dots, no actions)
 *   status       the status line for phase 'loading'
 *   leaving      fades the whole screen out (300ms) before it unmounts
 *   onCancel     Cancel (and Escape) while sweeping; no button without it
 *   onRetry      "Try again" on error
 *   onBack       "Back" on error (and Escape)
 *
 * While mounted it sets body.sonar-ping-active, which turns the in-app nav
 * the loader's colour (nav-sonar-dark.css). Counted, since route loading
 * can hand over to the in-page overlay.
 */
import { useEffect, useRef, useState } from 'react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { STEP_MS, sweepView } from '@/lib/sonar/ping-progress';
import './sonar-ping-loader.css';

const SLOW_MS = 20_000;
const FADE_MS = 300;

const DEFAULT_DIMENSIONS = DATASET_TAXONOMY.map((d) => ({ id: d.id, name: d.label }));

let mounted = 0;

export function SonarPingLoader({
  entityLabel = '',
  dimensions = DEFAULT_DIMENSIONS,
  phase = 'sweeping',
  status: loadingStatus = 'Loading Sonar',
  leaving = false,
  onCancel = null,
  onRetry = null,
  onBack = null,
}) {
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  const actionRef = useRef(null);
  const sweeping = phase === 'sweeping';

  /* The nav follows the loader's ground while it is up. */
  useEffect(() => {
    mounted += 1;
    document.body.classList.add('sonar-ping-active');
    return () => {
      mounted = Math.max(0, mounted - 1);
      if (!mounted) document.body.classList.remove('sonar-ping-active');
    };
  }, []);

  /* The sweep timer restarts with each new sweep (a retry). */
  useEffect(() => {
    if (!sweeping) return undefined;
    setStep(0);
    setSlow(false);
    const tick = setInterval(() => setStep((s) => s + 1), STEP_MS);
    const late = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(late);
    };
  }, [sweeping]);

  /* Focus the screen's action (Cancel, or Try again on error). */
  useEffect(() => {
    actionRef.current?.focus({ preventScroll: true });
  }, [phase]);

  /* Escape cancels a sweep, or goes back from an error. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (sweeping && onCancel) onCancel();
      else if (phase === 'error' && onBack) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sweeping, phase, onCancel, onBack]);

  const view = phase === 'loading' ? null : sweepView(dimensions, step, phase);
  const statusText = view ? view.status : loadingStatus;

  /* The status line crossfades: the shown text swaps at the midpoint of a
     300ms fade. Reduced motion swaps it at once (the CSS drops the fade). */
  const [shown, setShown] = useState(statusText);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (statusText === shown) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(statusText);
      return undefined;
    }
    setFading(true);
    const t = setTimeout(() => {
      setShown(statusText);
      setFading(false);
    }, FADE_MS / 2);
    return () => clearTimeout(t);
  }, [statusText, shown]);

  return (
    <div className={`snrp${phase === 'error' ? ' is-error' : ''}${leaving ? ' is-leaving' : ''}`}>
      <div className="snrp-pulse" role="img" aria-label="Sonar ping in progress">
        <span className="snrp-ring" />
        <span className="snrp-ring" />
        <span className="snrp-ring" />
        <span className="snrp-core" />
      </div>

      <div className="snrp-text">
        {entityLabel ? <span className="snrp-entity">{entityLabel}</span> : null}
        <span className={`snrp-status${fading ? ' is-fading' : ''}`} aria-live="polite">
          {shown}
        </span>
        {slow && sweeping ? (
          <span className="snrp-slow">Still sweeping. Deep pings can take up to a minute.</span>
        ) : null}
      </div>

      {view ? (
        <div
          className="snrp-dots"
          role="progressbar"
          aria-label="Dimensions swept"
          aria-valuemin={0}
          aria-valuemax={dimensions.length}
          aria-valuenow={view.done}
        >
          {view.dots.map((st, i) => (
            <span key={dimensions[i].id} className={`snrp-dot is-${st}`} aria-hidden="true" />
          ))}
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="snrp-actions">
          {onRetry ? (
            <button
              ref={actionRef}
              type="button"
              className="snrp-btn snrp-btn--primary"
              onClick={onRetry}
            >
              Try again
            </button>
          ) : null}
          {onBack ? (
            <button type="button" className="snrp-btn" onClick={onBack}>
              Back
            </button>
          ) : null}
        </div>
      ) : sweeping && onCancel ? (
        <div className="snrp-actions">
          <button ref={actionRef} type="button" className="snrp-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default SonarPingLoader;
