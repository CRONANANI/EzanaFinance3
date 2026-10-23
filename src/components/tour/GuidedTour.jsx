'use client';

/**
 * Reusable first-visit guided tour. A page marks its stops with
 * data-tour="step-id", passes `steps` here, and the tour dims the page,
 * spotlights one element at a time and explains it in a tooltip.
 *
 * No library: a fixed layer (pointer-events: none, so the page stays
 * clickable), a spotlight div whose giant box-shadow is the scrim, and a
 * tooltip dialog. Steps whose target is not in the DOM are skipped, so a
 * section that did not render (no committees, say) never strands the tour.
 * Esc skips, arrow keys navigate, Enter on the last step finishes. The
 * tooltip flips above the target when there is no room below and clamps to
 * the viewport on phones. prefers-reduced-motion turns off the pulse and
 * smooth scrolling.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './guided-tour.css';

const present = (step) =>
  typeof document !== 'undefined' && document.querySelector(`[data-tour="${step.target}"]`);

export default function GuidedTour({ steps, open, onFinish, onSkip, hideNext = false }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [live, setLive] = useState(steps);

  /* Re-resolve which steps exist each time the tour opens. */
  useEffect(() => {
    if (!open) return;
    setLive(steps.filter(present));
    setI(0);
  }, [open, steps]);

  const step = live[i] || null;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
  }, [step]);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, i, measure]);

  const next = useCallback(() => {
    setI((v) => {
      /* Skip forward over steps whose target has since unmounted. */
      let j = v + 1;
      while (j < live.length && !present(live[j])) j += 1;
      if (j >= live.length) {
        onFinish();
        return v;
      }
      return j;
    });
  }, [live, onFinish]);
  const back = useCallback(() => {
    setI((v) => {
      let j = v - 1;
      while (j >= 0 && !present(live[j])) j -= 1;
      return Math.max(0, j);
    });
  }, [live]);

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => measure();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onSkip();
      }
      if (e.key === 'ArrowRight' && !hideNext) next();
      if (e.key === 'ArrowLeft' && !hideNext) back();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    /* Capture phase, so the member panel's own Escape handler (which closes
       the panel) does not fire while the tour is up. */
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, measure, onSkip, next, back, hideNext]);

  if (!open || !step || typeof document === 'undefined') return null;

  const pad = 8;
  const below = rect ? rect.bottom + 190 < window.innerHeight : true;
  const tooltipStyle = rect
    ? {
        top: below ? rect.bottom + pad + 12 : undefined,
        bottom: below ? undefined : window.innerHeight - rect.top + pad + 12,
        left: Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - 336)),
      }
    : { top: '40%', left: '50%', transform: 'translateX(-50%)' };

  return createPortal(
    <div className="gtour-layer" aria-live="polite">
      {rect ? (
        <div
          className="gtour-spotlight"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div role="dialog" aria-label={step.title} className="gtour-tooltip" style={tooltipStyle}>
        <span className="gtour-counter">
          {i + 1} of {live.length}
        </span>
        <h4 className="gtour-title">{step.title}</h4>
        <p className="gtour-body">{step.body}</p>
        <div className="gtour-actions">
          <button type="button" className="gtour-ghost" onClick={onSkip}>
            Skip
          </button>
          {i > 0 && !hideNext ? (
            <button type="button" className="gtour-ghost" onClick={back}>
              Back
            </button>
          ) : null}
          {!hideNext ? (
            <button type="button" className="gtour-primary" onClick={next}>
              {i === live.length - 1 ? 'Finish' : 'Next'}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
