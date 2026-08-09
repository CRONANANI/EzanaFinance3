'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shared shell: FIG label, kicker, interaction hint, body, source line.
 *
 * Scroll-reveal: the first time the figure enters the viewport (threshold
 * ~0.25) it gains `is-revealed`, which the CSS uses to rise + fade the whole
 * figure in and which chart internals key their staged draw-in off of. The
 * observer fires once, then disconnects. When IntersectionObserver is
 * unavailable (SSR / old browsers) the figure defaults to revealed so nothing
 * is ever hidden. Fully disabled under prefers-reduced-motion via CSS.
 */
export function EchoFigureShell({ figureLabel, kicker, hint, source, children }) {
  const rootRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }
    const node = rootRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={rootRef} className={`echo-fig${revealed ? ' is-revealed' : ''}`}>
      {figureLabel && <h4 className="echo-fig-label">{figureLabel}</h4>}
      {kicker && <p className="echo-fig-kicker">{kicker}</p>}
      {hint && <p className="echo-fig-hint">{hint}</p>}
      <div className="echo-fig-scroll">{children}</div>
      <span className="echo-fig-swipe">← swipe to explore →</span>
      {source && <figcaption className="echo-fig-source">Source: {source}</figcaption>}
    </figure>
  );
}
