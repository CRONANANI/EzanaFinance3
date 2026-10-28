'use client';

import { cx } from './tokens';

/**
 * Typography primitives: the landing page's type system for in-app use.
 *
 *   <Eyebrow>   mono 11px caps kicker in emerald, above a title.
 *   <Heading>   one heading role per level: page | section | card.
 *   <PageHeader> eyebrow + h1 + optional lead + trailing actions.
 *
 * Every size, weight and tracking value reads from the --type-* ramp in
 * src/app/theme-variables.css, so retuning the ramp retunes the app.
 */

const LEVEL_TAG = { page: 'h1', section: 'h2', card: 'h3' };

export function Eyebrow({ as: Tag = 'div', tone = 'brand', className, children, ...rest }) {
  return (
    <Tag className={cx('ds-eyebrow', tone === 'muted' && 'ds-eyebrow--muted', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Heading({ level = 'section', as, className, children, ...rest }) {
  const Tag = as || LEVEL_TAG[level] || 'h2';
  return (
    <Tag className={cx('ds-heading', `ds-heading--${level}`, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({ eyebrow, title, lead, actions, className, children }) {
  return (
    <header className={cx('ds-page-header', className)}>
      <div className="ds-page-header-text">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Heading level="page">{title}</Heading>
        {lead && <p className="ds-page-header-lead">{lead}</p>}
        {children}
      </div>
      {actions && <div className="ds-page-header-actions">{actions}</div>}
    </header>
  );
}
