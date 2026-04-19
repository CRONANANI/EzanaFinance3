'use client';

import './model-card-shell.css';

/**
 * ModelCardShell — shared neutral card wrapper used across the Research
 * page for *model / analysis* cards (GARP/GRPV, DCF, Stress Test, MPT, etc.).
 *
 * The card surface uses the same tokens (--surface-card / --border-primary)
 * as every other card in the app, which resolve to the same color as the
 * top nav bar. The icon pill stays emerald because that's the primary-on-
 * subtle-primary treatment used on every other card header.
 *
 * Props:
 *   icon        — Bootstrap Icons class, e.g. 'bi-shield-exclamation'
 *   title       — short title rendered next to the icon pill
 *   description — optional subtitle line
 *   proBadge    — if true, shows a "Pro" chip next to the title
 *   actions     — optional node rendered in the top-right of the header
 *   className   — extra classes on the outer <section>
 */
export function ModelCardShell({
  icon = 'bi-stars',
  title,
  description,
  proBadge = false,
  actions = null,
  children,
  className = '',
}) {
  return (
    <section className={`mcs-card ${className}`.trim()}>
      <header className="mcs-header">
        <div className="mcs-header-left">
          <div className="mcs-icon-pill" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </div>
          <div className="mcs-title-block">
            <div className="mcs-title-row">
              <h3 className="mcs-title">{title}</h3>
              {proBadge && (
                <span className="mcs-pro-badge" title="Advanced Pro membership">
                  <i className="bi bi-stars" />
                  Pro
                </span>
              )}
            </div>
            {description && <p className="mcs-desc">{description}</p>}
          </div>
        </div>
        {actions && <div className="mcs-header-actions">{actions}</div>}
      </header>
      <div className="mcs-body">{children}</div>
    </section>
  );
}

export default ModelCardShell;
