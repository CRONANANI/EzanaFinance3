'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
      target.style.position = target.style.position || 'relative';
      target.style.zIndex = '100';
      target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.2)';
      target.style.borderRadius = target.style.borderRadius || '8px';
      target.style.transition = 'box-shadow 0.3s ease';

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
        el.style.boxShadow = '';
        el.style.zIndex = '';
      }
    };
  }, [visible, targetSelector, measure]);

  if (!visible || !coords) return null;

  const gap = 16;

  const getTooltipStyle = () => {
    switch (position) {
      case 'top':
        return {
          left: coords.centerX,
          top: coords.top - gap,
          transform: 'translate(-50%, -100%)',
        };
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
      default:
        return {
          left: coords.centerX,
          top: coords.top - gap,
          transform: 'translate(-50%, -100%)',
        };
    }
  };

  const getArrowRotation = () => {
    switch (position) {
      case 'top':
        return '180deg';
      case 'bottom':
        return '0deg';
      case 'left':
        return '90deg';
      case 'right':
        return '-90deg';
      default:
        return '180deg';
    }
  };

  const arrowPos =
    position === 'top'
      ? { bottom: '-10px', left: '50%', marginLeft: '-8px' }
      : position === 'bottom'
        ? { top: '-10px', left: '50%', marginLeft: '-8px' }
        : position === 'left'
          ? { right: '-10px', top: '50%', marginTop: '-5px' }
          : { left: '-14px', top: '50%', marginTop: '-5px' };

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss guide"
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9990,
          border: 'none',
          cursor: 'default',
        }}
      />

      <div
        style={{
          position: 'fixed',
          ...getTooltipStyle(),
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            background: '#111',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '14px 18px',
            maxWidth: '280px',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
          }}
        >
          <p style={{ color: '#fff', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '10px' }}>{message}</p>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#888',
              fontSize: '0.75rem',
              padding: '4px 12px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>

        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '10px solid #10b981',
            position: 'absolute',
            transform: `rotate(${getArrowRotation()})`,
            ...arrowPos,
          }}
        />
      </div>
    </>
  );
}
