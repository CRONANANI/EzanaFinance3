'use client';

import { hubHref } from '@/lib/datasets/hubs';
import './hub-link.css';

/**
 * "Hub ->" beside a dimension's title in every Datasets menu. Takes the
 * dimension's colour (the same value its icon uses) and opens its hub page.
 */
export default function HubLink({
  dimensionId,
  dimensionLabel,
  color,
  active = false,
  onNavigate,
}) {
  return (
    <a
      href={hubHref(dimensionId)}
      className={`dshub-link${active ? ' is-active' : ''}`}
      style={{ '--dshub-color': color }}
      aria-label={`Open the ${dimensionLabel} hub`}
      aria-current={active ? 'page' : undefined}
      role="menuitem"
      onClick={onNavigate}
    >
      <span className="dshub-word">Hub</span>
      <i className="bi bi-arrow-right dshub-arrow" aria-hidden="true" />
    </a>
  );
}
