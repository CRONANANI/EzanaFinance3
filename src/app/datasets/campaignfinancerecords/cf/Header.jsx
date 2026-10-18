'use client';

/**
 * CFPageHeader, CFSectionNav and FilingActivityStrip.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { hubHref } from '@/lib/datasets/hubs';
import { cycleLabel, easternTime, longDate } from './format';
import { MemberPicker } from './ui';

export function CFPageHeader({ data, cycle, cycles, onCycle, onExport, exportDisabled }) {
  const updated = easternTime(data?.synced);
  const through = longDate(data?.latestPeriodEnd);
  const listed = [...new Set([2026, 2024, 2022, ...cycles])].sort((a, b) => b - a);
  return (
    <header className="cfi-header">
      <nav className="cfi-crumbs" aria-label="Breadcrumb">
        <Link href="/datasets">Datasets</Link>
        <span aria-hidden="true">/</span>
        <Link href={hubHref('capitol')}>Capitol Watch</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Campaign Finance</span>
      </nav>

      <div className="cfi-header-row">
        <div className="cfi-header-copy">
          <h1 className="cfi-title">Campaign Finance Intelligence</h1>
          <p className="cfi-lead">
            Receipts, spending, cash, debt and outside money for every member of Congress, with the
            organizations, advertising, committees and elections around them. Figures cover the two
            year reporting cycle.
          </p>
        </div>

        <div className="cfi-header-side">
          <div className="cfi-header-controls">
            <label className="cfi-cycle">
              <span className="cfi-eyebrow">Cycle</span>
              <select
                className="cfi-select cfi-mono"
                value={cycle}
                onChange={(e) => onCycle(Number(e.target.value))}
              >
                {listed.map((c) => (
                  <option key={c} value={c} disabled={!cycles.includes(c)}>
                    {cycleLabel(c)}
                    {cycles.includes(c) ? '' : ' (not available yet)'}
                  </option>
                ))}
              </select>
            </label>
            <Link className="cfi-btn" href={hubHref('capitol')}>
              <i className="bi bi-terminal" aria-hidden="true" />
              Query in EzanaQL
            </Link>
            <button type="button" className="cfi-btn" onClick={onExport} disabled={exportDisabled}>
              <i className="bi bi-download" aria-hidden="true" />
              Export
            </button>
          </div>
          {updated || through ? (
            <p className="cfi-freshness">
              <i className="cfi-live-dot" aria-hidden="true" />
              {updated ? (
                <>
                  Totals updated <b className="cfi-mono">{updated}</b>
                </>
              ) : null}
              {updated && through ? <span aria-hidden="true"> · </span> : null}
              {through ? (
                <>
                  Latest period through <b className="cfi-mono">{through}</b>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export const CF_SECTIONS = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'overview', label: 'Overview' },
  { id: 'money', label: 'Campaign money' },
  { id: 'outside', label: 'Outside money' },
  { id: 'ads', label: 'Political ads' },
  { id: 'votes', label: 'Committees and votes' },
  { id: 'elections', label: 'Elections' },
  { id: 'disclosures', label: 'Disclosures' },
  { id: 'filings', label: 'Filings' },
];

/** Sticky section bar with scroll spy and the member search. */
export function CFSectionNav({ members, onMember }) {
  const [active, setActive] = useState('leaderboard');

  useEffect(() => {
    const els = CF_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length) {
          vis.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(vis[0].target.id);
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  return (
    <div className="cfi-secnav">
      <nav className="cfi-secnav-tabs" aria-label="Page sections">
        {CF_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`cfi-secnav-tab${active === s.id ? ' is-on' : ''}`}
            aria-current={active === s.id ? 'true' : undefined}
            onClick={(e) => go(e, s.id)}
          >
            {s.label}
          </a>
        ))}
      </nav>
      <div className="cfi-secnav-search">
        <MemberPicker
          members={members}
          value={null}
          onChange={(id) => id && onMember(id)}
          placeholder="Research a member"
        />
      </div>
    </div>
  );
}

/**
 * Slim ticker of the latest real filings. Renders nothing until filing
 * timestamps exist; it never shows placeholder items.
 */
export function FilingActivityStrip({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div className="cfi-strip" aria-label="Latest filings">
      <span className="cfi-strip-label cfi-mono">Latest filings</span>
      <div className="cfi-strip-track">
        {items.map((it) => (
          <span key={it.key} className="cfi-strip-item">
            <b>{it.member}</b> <span className="cfi-mono">{it.report}</span> {it.figure}{' '}
            <span className="cfi-mono">{it.date}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
