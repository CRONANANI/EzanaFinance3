'use client';

/**
 * ResearchWorkspaceShell (Sonar research workspace, Nov 13 2026): the layout of the Research
 * history, Saved research and Research library pages. The left rail carries the same Research
 * menu as every Sonar answer, with this page's item marked current; the main column holds
 * the page. Flat hairline rows in the /home idiom, not bordered cards. Styles:
 * research-workspace.css (srw-).
 */
import Link from 'next/link';
import { researchMenu } from '../workspace-rail-helpers';
import './research-workspace.css';

export function ResearchMenu({ current }) {
  const items = researchMenu({ signedIn: true, current });
  return (
    <nav className="srw-menu" aria-label="Research">
      <p className="srw-menu-head">Research</p>
      <ul className="srw-menu-list">
        {items.map((r) => (
          <li key={r.key}>
            {r.current ? (
              <span className="srw-menu-link is-current" aria-current="page">
                <i className={`bi ${r.icon}`} aria-hidden="true" />
                {r.label}
              </span>
            ) : (
              <Link className="srw-menu-link" href={r.href}>
                <i className={`bi ${r.icon}`} aria-hidden="true" />
                {r.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ResearchWorkspaceShell({ current, title, lede = null, actions = null, children }) {
  return (
    <div className="srw">
      <aside className="srw-side">
        <ResearchMenu current={current} />
      </aside>
      <main className="srw-main">
        <header className="srw-head">
          <div>
            <p className="srw-eyebrow">Sonar</p>
            <h1 className="srw-title">{title}</h1>
            {lede ? <p className="srw-lede">{lede}</p> : null}
          </div>
          {actions ? <div className="srw-actions">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}

export const MODE = { quick: 'Quick ping', standard: 'Standard research', deep: 'Deep research' };

export function dateLabel(value) {
  const t = Date.parse(value || '');
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(t));
}

export default ResearchWorkspaceShell;
