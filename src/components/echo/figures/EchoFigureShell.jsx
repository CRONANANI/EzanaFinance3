'use client';

/** Shared shell: FIG label, kicker, interaction hint, body, source line. */
export function EchoFigureShell({ figureLabel, kicker, hint, source, children }) {
  return (
    <figure className="echo-fig">
      {figureLabel && <h4 className="echo-fig-label">{figureLabel}</h4>}
      {kicker && <p className="echo-fig-kicker">{kicker}</p>}
      {hint && <p className="echo-fig-hint">{hint}</p>}
      {children}
      {source && <figcaption className="echo-fig-source">Source: {source}</figcaption>}
    </figure>
  );
}
