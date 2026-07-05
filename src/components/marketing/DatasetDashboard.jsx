'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DatasetTable } from './DatasetTable';

/**
 * DatasetDashboard — the shared composition for every public /datasets
 * dimension page: hero → optional search row (client-side filters the table)
 * → optional highlight/leaderboard callout → primary DatasetTable (with an
 * honest "sample" label) → source attribution → CTA into the app.
 *
 * Each page passes a `config` object; the data lives in co-located
 * `*-sample.js` modules so it is unmistakably static sample data.
 */
export function DatasetDashboard({ config, children }) {
  const {
    eyebrow = 'Datasets',
    title,
    lead,
    searches = [],
    highlight,
    table,
    tableLink,
    sampleNote,
    source,
    cta,
    onRowClick,
    getRowLabel,
  } = config;

  const [terms, setTerms] = useState({});

  const filteredRows = useMemo(() => {
    return table.rows.filter((row) =>
      searches.every((s) => {
        const term = (terms[s.id] || '').trim().toLowerCase();
        if (!term) return true;
        return s.keys.some((k) =>
          String(row[k] ?? '')
            .toLowerCase()
            .includes(term),
        );
      }),
    );
  }, [table.rows, searches, terms]);

  const HighlightIcon = highlight?.icon;

  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">{eyebrow}</p>
        <h1 className="mkt-h1">{title}</h1>
        <p className="mkt-lead">{lead}</p>
      </div>

      {searches.length > 0 && (
        <div className="mkt-ds-search-row" role="search">
          {searches.map((s) => {
            const Icon = s.icon;
            return (
              <label key={s.id} className="mkt-ds-search">
                <span className="mkt-ds-search-label">{s.label}</span>
                <span className="mkt-ds-search-field">
                  {Icon ? <Icon size={16} aria-hidden /> : null}
                  <input
                    type="text"
                    className="mkt-ds-input"
                    placeholder={s.placeholder}
                    value={terms[s.id] || ''}
                    onChange={(e) => setTerms((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    aria-label={s.label}
                  />
                </span>
              </label>
            );
          })}
        </div>
      )}

      {highlight && (
        <div className="mkt-card mkt-ds-highlight">
          <div className="mkt-ds-highlight-head">
            {highlight.badge ? <span className="mkt-ds-badge-new">{highlight.badge}</span> : null}
            <span className="mkt-ds-highlight-title">
              {HighlightIcon ? <HighlightIcon size={18} aria-hidden /> : null}
              {highlight.title}
            </span>
          </div>
          {highlight.desc ? <p className="mkt-ds-highlight-desc">{highlight.desc}</p> : null}
          {highlight.items ? (
            <ol className="mkt-ds-leader">
              {highlight.items.map((it, i) => {
                // Opt-in: a `highlight.onItemClick` handler makes each row an
                // accessible button that opens the shared detail popup. Pages
                // that don't provide it keep static, non-interactive rows.
                const clickable = typeof highlight.onItemClick === 'function';
                return (
                  <li
                    key={it.name ?? i}
                    className={`mkt-ds-leader-row${clickable ? ' mkt-ds-leader-row--clickable' : ''}`}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `View details for ${it.name}` : undefined}
                    onClick={clickable ? () => highlight.onItemClick(it) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              highlight.onItemClick(it);
                            }
                          }
                        : undefined
                    }
                  >
                    <span className="mkt-ds-leader-rank">{i + 1}</span>
                    <span className="mkt-ds-leader-main">
                      <span className="mkt-ds-leader-name">{it.name}</span>
                      {it.meta ? <span className="mkt-ds-leader-meta">{it.meta}</span> : null}
                    </span>
                    <span
                      className={`mkt-ds-leader-value mkt-ds-mono${
                        it.tone === 'pos' ? ' mkt-ds-pos' : it.tone === 'neg' ? ' mkt-ds-neg' : ''
                      }`}
                    >
                      {it.value}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      )}

      <section className="mkt-ds-section">
        {table.caption ? <h2 className="mkt-section-title">{table.caption}</h2> : null}
        {sampleNote ? <p className="mkt-ds-sample-note">{sampleNote}</p> : null}
        <DatasetTable
          columns={table.columns}
          rows={filteredRows}
          onRowClick={onRowClick}
          getRowLabel={getRowLabel}
        />
        {tableLink ? (
          <p className="mkt-ds-table-link">
            <Link href={tableLink.href}>
              {tableLink.label}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </p>
        ) : null}
      </section>

      {children ? <section className="mkt-ds-section">{children}</section> : null}

      {source && (
        <section className="mkt-ds-section">
          <h2 className="mkt-section-title">{source.title || 'How we source it'}</h2>
          <div className="mkt-card">
            {(Array.isArray(source.body) ? source.body : [source.body]).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

      <div className="mkt-cta-block">
        <Link href={cta?.href || '/auth/login'} className="mkt-cta-btn">
          {cta?.label || 'Explore in the app'}
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </>
  );
}
