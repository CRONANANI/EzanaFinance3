'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconButton } from '@/components/ds';
import { QUANT_BASE, useQuantContext } from './useQuantContext';

/** The eight workspaces, in sidebar order. */
export const WORKSPACES = [
  { id: 'overview', label: 'Overview', href: QUANT_BASE, icon: 'bi-house' },
  {
    id: 'strategy',
    label: 'Strategy Lab',
    href: `${QUANT_BASE}/strategy-lab`,
    icon: 'bi-diagram-2',
  },
  {
    id: 'backtest',
    label: 'Backtesting',
    href: `${QUANT_BASE}/backtesting`,
    icon: 'bi-play-circle',
  },
  {
    id: 'factor',
    label: 'Factor Research',
    href: `${QUANT_BASE}/factor-research`,
    icon: 'bi-bar-chart',
  },
  {
    id: 'risk',
    label: 'Risk & Portfolio',
    href: `${QUANT_BASE}/risk-portfolio`,
    icon: 'bi-shield-check',
  },
  {
    id: 'statarb',
    label: 'Statistical Arbitrage',
    href: `${QUANT_BASE}/statistical-arbitrage`,
    icon: 'bi-arrow-left-right',
  },
  {
    id: 'datasets',
    label: 'Datasets & Research',
    href: `${QUANT_BASE}/datasets-research`,
    icon: 'bi-database',
  },
  { id: 'paper', label: 'Paper Trading', href: `${QUANT_BASE}/paper-trading`, icon: 'bi-send' },
];

/** The lower group. Only Quant Lab routes carry the research context. */
export const ALSO_IN_EZANA = [
  { label: 'Model library', href: `${QUANT_BASE}/model-library`, inLab: true },
  { label: 'Strategy leaderboard', href: `${QUANT_BASE}/community-strategies`, inLab: true },
  { label: 'Prediction markets', href: '/betting-markets' },
  { label: 'Quant courses', href: '/learning-center' },
];

const STORAGE_KEY = 'ezana.quantLab.sidebarCollapsed';

const isCurrent = (pathname, href) =>
  href === QUANT_BASE
    ? pathname === QUANT_BASE
    : pathname === href || pathname.startsWith(`${href}/`);

export function QuantLabSidebar() {
  const pathname = usePathname() || QUANT_BASE;
  const { strategy, version, href } = useQuantContext();
  const [collapsed, setCollapsed] = useState(false);

  /* A per-viewer convenience only. Storage can be unavailable; the sidebar
     then simply starts open. */
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* stays open */
    }
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, v ? '0' : '1');
      } catch {
        /* not remembered */
      }
      return !v;
    });
  };

  /* The strategy and version follow the user; a run belongs to the page it
     was opened on, so sidebar links do not carry it. */
  const link = (path) => href(path, { strategy, version, run: '' });

  return (
    <nav className="qlx-side" aria-label="Quant Lab workspaces" data-collapsed={collapsed}>
      <div className="qlx-side-head">
        {!collapsed && (
          <span className="qlx-side-brand">
            <i className="bi bi-layers" aria-hidden />
            <span>Quant Lab</span>
          </span>
        )}
        <IconButton
          size="sm"
          icon={collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}
          label={collapsed ? 'Expand Quant Lab navigation' : 'Collapse Quant Lab navigation'}
          aria-expanded={!collapsed}
          onClick={toggle}
        />
      </div>
      <div className="qlx-side-nav">
        {WORKSPACES.map((w) => (
          <Link
            key={w.id}
            href={link(w.href)}
            className="qlx-side-link"
            aria-current={isCurrent(pathname, w.href) ? 'page' : undefined}
            aria-label={collapsed ? w.label : undefined}
            title={collapsed ? w.label : undefined}
          >
            <i className={`bi ${w.icon}`} aria-hidden />
            <span className="qlx-side-label">{w.label}</span>
          </Link>
        ))}
      </div>
      <div className="qlx-side-more">
        <span className="qlx-eyebrow qlx-side-link qlx-side-link--minor">Also in Ezana</span>
        {ALSO_IN_EZANA.map((a) => (
          <Link
            key={a.href}
            href={a.inLab ? link(a.href) : a.href}
            className="qlx-side-link qlx-side-link--minor"
            aria-current={isCurrent(pathname, a.href) ? 'page' : undefined}
          >
            {a.label}
          </Link>
        ))}
      </div>
      {/* On the narrow strip the lower group is a menu. */}
      <details className="qlx-side-menu">
        <summary className="qlx-btn qlx-btn--sm">More</summary>
        <div className="qlx-menu">
          {ALSO_IN_EZANA.map((a) => (
            <Link key={a.href} href={a.inLab ? link(a.href) : a.href}>
              {a.label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}

export default QuantLabSidebar;
