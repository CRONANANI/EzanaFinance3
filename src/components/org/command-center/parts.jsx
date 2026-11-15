'use client';

import Link from 'next/link';

/** A flat section: a heading and whitespace. No surface (branding guide 4.1). */
export function Section({ id, title, aside, className = '', children }) {
  return (
    <section className={`tcc-section ${className}`.trim()} aria-labelledby={id}>
      <div className="tcc-head">
        <h2 className="tcc-title" id={id}>
          {title}
        </h2>
        {aside ? <div className="tcc-head__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Skeleton bar. Decorative: the section carries aria-busy. */
export function Skel({ w = '100%', h = 12, className = '' }) {
  return (
    <span
      className={`tcc-skel ${className}`.trim()}
      style={{ width: w, height: h }}
      aria-hidden="true"
    />
  );
}

/** Inline error: one short message and Retry. The rest of the page keeps working. */
export function SectionError({ message, onRetry }) {
  return (
    <p className="tcc-state tcc-state--error" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </p>
  );
}

/** Empty state: one line and one action. */
export function Empty({ children, href, action, onAction }) {
  return (
    <p className="tcc-state">
      <span>{children}</span>
      {href && action ? <ArrowLink href={href}>{action}</ArrowLink> : null}
      {!href && action && onAction ? (
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </p>
  );
}

export function ArrowLink({ href, children, className = '' }) {
  return (
    <Link href={href} className={`tcc-link ${className}`.trim()}>
      {children} <i className="bi bi-arrow-right" aria-hidden="true" />
    </Link>
  );
}

/** A text-only single or multi select: emerald text when on, grey when off. */
export function TextToggle({ pressed, onClick, children, mono = false }) {
  return (
    <button
      type="button"
      className={`tcc-toggle${pressed ? ' is-on' : ''}${mono ? ' tcc-mono' : ''}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
