'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

/**
 * Count-up animation (scroll-triggered). Numbers ease from 0; labels like "Sub-100ms" fade in.
 */

function parseStatValue(value) {
  const textOnly = ['Sub-100ms', 'Real-time', 'Daily', '24/7'];
  if (textOnly.includes(value)) {
    return { type: 'text', display: value };
  }

  const cleaned = value.replace(/,/g, '');
  const match = cleaned.match(/^(\$?)([\d.]+)\s*(K|M|B|T)?\s*(\+?)$/i);
  if (!match) {
    return { type: 'text', display: value };
  }

  const prefix = match[1] || '';
  const num = parseFloat(match[2]);
  const suffix = match[3] || '';
  const plus = match[4] || '';
  const hasDecimal = match[2].includes('.');
  const decimals = hasDecimal ? match[2].split('.')[1].length : 0;

  return {
    type: 'number',
    num,
    prefix,
    suffix: suffix.toUpperCase(),
    plus,
    decimals,
    display: value,
  };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function formatNumber(n, decimals, addCommas) {
  let str = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  if (addCommas && decimals === 0) {
    str = Number(str).toLocaleString('en-US');
  }
  return str;
}

export function CountUpStat({ value, className = '' }) {
  const ref = useRef(null);
  const [displayValue, setDisplayValue] = useState('');
  const [visible, setVisible] = useState(false);
  const hasAnimated = useRef(false);

  const parsed = useMemo(() => parseStatValue(value), [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setVisible(true);

          const p = parsed;
          if (p.type === 'text') {
            setDisplayValue(p.display);
            return;
          }

          const duration = 1500;
          const startTime = performance.now();
          const needsCommas = p.num >= 1000 && !p.suffix;

          function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const current = easedProgress * p.num;

            const formatted = formatNumber(current, p.decimals, needsCommas);
            setDisplayValue(`${p.prefix}${formatted}${p.suffix}${p.plus}`);

            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              const final = formatNumber(p.num, p.decimals, needsCommas);
              setDisplayValue(`${p.prefix}${final}${p.suffix}${p.plus}`);
            }
          }

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [parsed]);

  return (
    <span
      ref={ref}
      className={`countup-stat ${visible ? 'countup-visible' : ''} ${className}`.trim()}
    >
      {displayValue || '\u00A0'}
    </span>
  );
}
