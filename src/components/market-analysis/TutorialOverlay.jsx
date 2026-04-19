'use client';

/**
 * First-visit tutorial overlay for the Global Market Analysis page.
 *
 * - Semi-transparent backdrop with a "spotlight" hole punched over the current
 *   feature (uses an SVG mask so the cutout has rounded corners and a glow ring).
 * - Floating tooltip card with Back / Next / Skip + a step counter.
 * - Dark-themed regardless of the user's global theme — the page itself is
 *   always forced-dark so the overlay just matches.
 * - Renders via a portal on document.body so it escapes any transformed
 *   ancestors (which would break fixed positioning).
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SPOTLIGHT_PAD = 10;
const TOOLTIP_WIDTH = 340;
const TOOLTIP_MIN_HEIGHT = 180;

function computeTooltipPosition(rect, placement) {
  const gap = 16;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const w = TOOLTIP_WIDTH;
  const h = TOOLTIP_MIN_HEIGHT;

  if (!rect || placement === 'center') {
    return {
      position: 'fixed',
      top: Math.max(16, vh / 2 - h / 2),
      left: Math.max(16, vw / 2 - w / 2),
    };
  }

  let top;
  let left;

  switch (placement) {
    case 'top':
      top = rect.top - h - gap;
      left = rect.left + rect.width / 2 - w / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - h / 2;
      left = rect.left - w - gap;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - h / 2;
      left = rect.right + gap;
      break;
    case 'bottom':
    default:
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - w / 2;
      break;
  }

  top = Math.max(16, Math.min(vh - h - 16, top));
  left = Math.max(16, Math.min(vw - w - 16, left));
  return { position: 'fixed', top, left };
}

export function TutorialOverlay({ steps, open, onComplete, onSkip }) {
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const rafRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = steps?.[index];

  // Measure the spotlight target every animation frame while open so we stay
  // glued to the element through sidebar toggles, scroll, and any CSS
  // transitions on the target itself.
  useEffect(() => {
    if (!open || !step) return undefined;
    if (!step.target) {
      setSpotlight(null);
      return undefined;
    }

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (!el) {
        setSpotlight((prev) => (prev == null ? prev : null));
        return;
      }
      const rect = el.getBoundingClientRect();
      // Only update state if the rect materially changed — avoids a React
      // re-render every frame which would tank performance on this page.
      setSpotlight((prev) => {
        if (
          prev &&
          Math.abs(prev.top - rect.top) < 0.5 &&
          Math.abs(prev.left - rect.left) < 0.5 &&
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        };
      });
    };

    measure();
    const tick = () => {
      measure();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, step]);

  // Keyboard controls: ← / → to step, Esc to skip.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onSkip?.();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, steps, onSkip]);

  if (!open || typeof document === 'undefined' || !step) return null;

  const isLast = index === steps.length - 1;
  const isFirst = index === 0;
  const placement = step.placement || (step.target ? 'bottom' : 'center');
  const tooltipStyle = computeTooltipPosition(spotlight, placement);

  return createPortal(
    <div
      className="mat-root"
      role="dialog"
      aria-modal="true"
      aria-label="Global Market Analysis tour"
    >
      <SpotlightBackdrop rect={spotlight} onClick={onSkip} />

      <div className="mat-tooltip" style={tooltipStyle}>
        <div className="mat-tooltip-head">
          <span className="mat-step-counter">
            Step {index + 1} of {steps.length}
          </span>
          <button
            type="button"
            className="mat-icon-btn"
            onClick={onSkip}
            aria-label="Skip tour"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>
        <h3 className="mat-title">{step.title}</h3>
        <p className="mat-body">{step.body}</p>
        <div className="mat-progress">
          {steps.map((s, i) => (
            <span key={s.id || i} className={`mat-dot ${i === index ? 'mat-dot--active' : ''} ${i < index ? 'mat-dot--done' : ''}`} />
          ))}
        </div>
        <div className="mat-actions">
          <button
            type="button"
            className="mat-btn mat-btn--ghost"
            onClick={onSkip}
          >
            Skip tour
          </button>
          <div className="mat-actions-right">
            <button
              type="button"
              className="mat-btn mat-btn--ghost"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={isFirst}
            >
              <i className="bi bi-chevron-left" aria-hidden /> Back
            </button>
            {isLast ? (
              <button
                type="button"
                className="mat-btn mat-btn--primary"
                onClick={onComplete}
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                className="mat-btn mat-btn--primary"
                onClick={() => setIndex((i) => Math.min(i + 1, steps.length - 1))}
              >
                Next <i className="bi bi-chevron-right" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SpotlightBackdrop({ rect, onClick }) {
  const maskId = 'mat-spotlight-mask';
  return (
    <svg
      className="mat-backdrop"
      onClick={onClick}
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {rect && (
            <rect
              x={rect.left - SPOTLIGHT_PAD}
              y={rect.top - SPOTLIGHT_PAD}
              width={rect.width + SPOTLIGHT_PAD * 2}
              height={rect.height + SPOTLIGHT_PAD * 2}
              rx="12"
              ry="12"
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(4, 8, 12, 0.72)"
        mask={`url(#${maskId})`}
      />
      {rect && (
        <rect
          x={rect.left - SPOTLIGHT_PAD}
          y={rect.top - SPOTLIGHT_PAD}
          width={rect.width + SPOTLIGHT_PAD * 2}
          height={rect.height + SPOTLIGHT_PAD * 2}
          rx="12"
          ry="12"
          fill="none"
          stroke="rgba(99, 102, 241, 0.9)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.55))' }}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
