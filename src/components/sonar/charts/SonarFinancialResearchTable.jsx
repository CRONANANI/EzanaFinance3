'use client';

/**
 * SonarFinancialResearchTable (Nov 28 2026): the research table of the Sonar library, adapted
 * from the 21st.dev "leads data table" pattern for investment research. The CRM fields,
 * probability scores and coloured status pills of the source are gone: columns are whatever
 * the analytical result returned (institutional holders, congressional transactions, a
 * screen, contractors, peer comparisons, macro comparisons), with their units and dates kept
 * on every value.
 *
 * Sorting (header buttons with aria-sort), search within the returned rows, column
 * visibility, row selection (shared with linked components), a source link per row,
 * pagination and CSV export of the returned rows when the result is exportable for the
 * reader's plan. A wide table scrolls inside its card, never the page. No row animation.
 *
 * columns  [{ key, label, type: 'text'|'ticker'|'number'|'money'|'percent'|'date', unit?,
 *            currency?, signed?, hidden? }]
 * rows     [{ id, href?, ...values }]   missing values are null and read N/A
 */
import { useId, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ds';
import { formatFigure, formatChange, num } from '@/lib/sonar/presentation/contracts';
import { useSonarSelection } from '../layout/SonarSelectionContext';
import './sonar-research-library.css';

const NUMERIC = new Set(['number', 'money', 'percent']);

function cellText(col, v) {
  if (v === null || v === undefined || v === '') return null;
  if (col.type === 'percent') return col.signed ? formatChange(v) : formatFigure(v, 'percent');
  if (col.type === 'money') return formatFigure(v, 'usd', { currency: col.currency || 'USD' });
  if (col.type === 'number') return formatFigure(v, col.unit);
  return String(v);
}

function csvOf(columns, rows) {
  const esc = (s) => {
    const t = s == null ? '' : String(s);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [
    columns.map((c) => esc(c.unit ? `${c.label} (${c.unit})` : c.label)).join(','),
    ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')),
  ].join('\n');
}

export function SonarFinancialResearchTable({
  columns = [],
  rows = [],
  caption = 'Research results',
  pageSize = 10,
  searchable = true,
  exportable = false,
  selectable = false,
  compact = false,
  fileName = 'sonar-research',
}) {
  const searchId = useId();
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState(
    () => new Set(columns.filter((c) => c.hidden).map((c) => c.key)),
  );
  const [selected, select] = useSonarSelection();
  const visible = columns.filter((c) => !hidden.has(c.key));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      columns.some((c) =>
        String(r[c.key] ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [rows, columns, q]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const numeric = col && NUMERIC.has(col.type);
    const dir = sort.dir === 'asc' ? 1 : -1;
    /* Missing values sort last in both directions. */
    return [...filtered].sort((a, b) => {
      const A = numeric ? num(a[sort.key]) : (a[sort.key] ?? null);
      const B = numeric ? num(b[sort.key]) : (b[sort.key] ?? null);
      if (A === null && B === null) return 0;
      if (A === null) return 1;
      if (B === null) return -1;
      return numeric ? (A - B) * dir : String(A).localeCompare(String(B)) * dir;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const shown = sorted.slice(cur * pageSize, cur * pageSize + pageSize);

  const toggleSort = (key) => {
    setPage(0);
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' },
    );
  };

  const doExport = () => {
    const blob = new Blob([csvOf(columns, sorted)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="srl-tablewrap">
      {!compact || (searchable && rows.length > pageSize) ? (
        <div className="srl-tools">
          {searchable && rows.length > 5 ? (
            <label className="srl-search" htmlFor={searchId}>
              <i className="bi bi-search" aria-hidden="true" />
              <input
                id={searchId}
                type="search"
                value={q}
                placeholder="Search these results"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          ) : (
            <span />
          )}
          <span className="srl-pager-btns">
            {columns.length > 4 ? (
              <details className="srl-colmenu">
                <summary className="srl-btn">
                  <i className="bi bi-layout-three-columns" aria-hidden="true" />
                  Columns
                </summary>
                <div className="srl-colmenu-list">
                  {columns.map((c, i) => (
                    <Checkbox
                      key={c.key}
                      label={c.label}
                      checked={!hidden.has(c.key)}
                      disabled={i === 0}
                      onChange={() =>
                        setHidden((h) => {
                          const n = new Set(h);
                          if (n.has(c.key)) n.delete(c.key);
                          else n.add(c.key);
                          return n;
                        })
                      }
                    />
                  ))}
                </div>
              </details>
            ) : null}
            {exportable && sorted.length ? (
              <button type="button" className="srl-btn" onClick={doExport}>
                <i className="bi bi-download" aria-hidden="true" />
                Export
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="srl-scroll">
        <table className="srl-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {visible.map((c) => {
                const numeric = NUMERIC.has(c.type);
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={numeric ? 'is-num' : undefined}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" className="srl-sort" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {c.unit && !['count', 'value', 'percent'].includes(c.unit)
                        ? ` (${c.unit})`
                        : ''}
                      <i
                        className={`bi ${active ? (sort.dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down') : 'bi-arrow-down-up'}`}
                        aria-hidden="true"
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, ri) => {
              const id = r.id ?? `${cur}-${ri}`;
              const isSel = selectable && selected === id;
              return (
                <tr key={id} aria-selected={selectable ? isSel : undefined}>
                  {visible.map((c, ci) => {
                    const text = cellText(c, r[c.key]);
                    const cls = [
                      NUMERIC.has(c.type) ? 'is-num' : '',
                      c.type === 'ticker' ? 'is-ticker' : '',
                      text === null ? 'is-na' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    let content = text === null ? 'N/A' : text;
                    if (ci === 0 && selectable)
                      content = (
                        <button
                          type="button"
                          className="srl-row-btn"
                          aria-pressed={isSel}
                          onClick={() => select(id)}
                        >
                          {content}
                        </button>
                      );
                    else if (ci === 0 && r.href)
                      content = (
                        <a
                          href={r.href}
                          className="srl-row-btn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {content}
                          <i
                            className="bi bi-box-arrow-up-right"
                            aria-hidden="true"
                            style={{ marginLeft: 6 }}
                          />
                        </a>
                      );
                    return (
                      <td key={c.key} className={cls || undefined}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!shown.length ? <p className="srl-state">No rows match this search.</p> : null}
      {sorted.length > pageSize ? (
        <div className="srl-pager">
          <span>
            Showing {cur * pageSize + 1} to {Math.min(sorted.length, (cur + 1) * pageSize)} of{' '}
            {sorted.length}
          </span>
          <span className="srl-pager-btns">
            <button
              type="button"
              className="srl-btn"
              disabled={cur === 0}
              onClick={() => setPage(cur - 1)}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              className="srl-btn"
              disabled={cur >= pages - 1}
              onClick={() => setPage(cur + 1)}
            >
              Next
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default SonarFinancialResearchTable;
