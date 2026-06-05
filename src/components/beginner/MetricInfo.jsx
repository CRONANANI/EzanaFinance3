'use client';

import { useState, useRef, useEffect } from 'react';
import { BEGINNER_GLOSSARY } from '@/lib/beginner-glossary';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import './beginner.css';

const OPEN_COUNT_PREFIX = 'explainer-opens:';

function getOpenCount(term) {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(`${OPEN_COUNT_PREFIX}${term}`) || 0);
}

function bumpOpenCount(term) {
  if (typeof window === 'undefined') return;
  const n = getOpenCount(term) + 1;
  window.localStorage.setItem(`${OPEN_COUNT_PREFIX}${term}`, String(n));
  return n;
}

export function MetricInfo({ term }) {
  const beginner = useBeginnerLevelOptional();
  const def = BEGINNER_GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    setOpenCount(getOpenCount(term));
  }, [term]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!def) return null;

  const showTips = beginner?.showTips ?? false;
  const shouldPulse = showTips && openCount < 2;

  const handleClick = () => {
    const n = bumpOpenCount(term);
    setOpenCount(n);
    setOpen((v) => !v);
    if (n >= 2) beginner?.markSeen?.(`explainer:${term}`);
  };

  return (
    <span className="beginner-metric-info" ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`beginner-metric-info-btn ${shouldPulse ? 'beginner-metric-info-btn--pulse' : ''}`}
        onClick={handleClick}
        aria-label={`What is ${term}?`}
        title={`What is ${term}?`}
      >
        ?
      </button>
      {open && (
        <div className="beginner-metric-popover" role="tooltip">
          {def}
        </div>
      )}
    </span>
  );
}
