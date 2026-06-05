'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './task-guide.css';

/**
 * Pointing arrow + instruction anchored to a target (fixed viewport coords).
 */
export function TaskGuide({ targetSelector, message, position = 'top', onDismiss, visible }) {
  const [coords, setCoords] = useState(null);
  const targetRef = useRef(null);

  const measure = useCallback(() => {
    if (!targetSelector || typeof document === 'undefined') return;
    const target = document.querySelector(targetSelector);
    if (!target) return;
    targetRef.current = target;
    const rect = target.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [targetSelector]);

  useEffect(() => {
    if (!visible || !targetSelector) {
      setCoords(null);
      return undefined;
    }

    let cancelled = false;
    let raf = 0;

    const run = () => {
      const target = document.querySelector(targetSelector);
      if (!target) {
        raf = requestAnimationFrame(run);
        return;
      }
      if (cancelled) return;
      targetRef.current = target;
      const pos = window.getComputedStyle(target).position;
      if (pos === 'static') {
        target.style.position = 'relative';
      }
      target.style.zIndex = '100';
      target.classList.add('task-guide-target-highlight');
      measure();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const t = setTimeout(run, 300);

    const onScrollOrResize = () => measure();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      cancelled = true;
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      const el = targetRef.current;
      if (el) {
        el.classList.remove('task-guide-target-highlight');
        el.style.zIndex = '';
      }
    };
  }, [visible, targetSelector, measure]);

  if (!visible || !coords) return null;

  const gap = 16;

  const getTooltipStyle = () => {
    switch (position) {
      case 'bottom':
        return {
          left: coords.centerX,
          top: coords.top + coords.height + gap,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          left: coords.left - gap,
          top: coords.centerY,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          left: coords.left + coords.width + gap,
          top: coords.centerY,
          transform: 'translate(0, -50%)',
        };
      case 'top':
      default:
        return {
          left: coords.centerX,
          top: coords.top - gap,
          transform: 'translate(-50%, -100%)',
        };
    }
  };

  const arrowClass = `task-guide-arrow task-guide-arrow--${position}`;

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss guide"
        onClick={onDismiss}
        className="task-guide-backdrop"
      />

      <div className="task-guide-tooltip" style={getTooltipStyle()}>
        <div className={`task-guide-bubble task-guide-bubble--${position}`}>
          <span className="task-guide-eyebrow lf-mono">DO THIS</span>
          <p className="task-guide-message">{message}</p>
          <button type="button" className="task-guide-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
        <div className={arrowClass} aria-hidden />
      </div>
    </>
  );
}
