'use client';

/**
 * SonarResearchSecuritiesMonitor (Nov 28 2026), adapted from the 21st.dev "market watchlist"
 * for the securities an executed research question identified (the tickers a member traded,
 * the holdings a screen returned, the peers a valuation compared). The source's five
 * hardcoded assets, blue accent and live-ticking prices are gone: rows are the run's own,
 * prices carry their as-of time, and nothing animates as if it were a live feed.
 *
 * Sortable columns (aria-sort), selection shared with linked components (emerald text only,
 * no accent bar), and an "Ask about" action that runs a follow-up through the host's own
 * ping path when the host passes onAsk.
 *
 * payload.data: { rows: [{ ticker, name?, price?, changePct?, period?, spark?: number[],
 *                 relevance?, metric?: { label, value, unit }, asOf? }] }
 */
import { useMemo, useState } from 'react';
import { formatFigure, formatChange, num } from '@/lib/sonar/presentation/contracts';
import { dayLabel } from '@/lib/sonar/desk-summary';
import { useSonarSelection } from '../layout/SonarSelectionContext';
import { Sparkline } from './Sparkline';
import './sonar-research-library.css';

const COLS = [
  { key: 'ticker', label: 'Security', numeric: false },
  { key: 'price', label: 'Price', numeric: true },
  { key: 'changePct', label: 'Change', numeric: true },
];

export function SonarResearchSecuritiesMonitor({ payload, onAsk = null }) {
  const p = payload || {};
  const rows = (p.data?.rows || []).filter((r) => r && r.ticker);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [selected, select] = useSonarSelection();

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === 'ticker') return String(a.ticker).localeCompare(String(b.ticker)) * dir;
      const A = num(a[sort.key]);
      const B = num(b[sort.key]);
      if (A === null) return 1;
      if (B === null) return -1;
      return (A - B) * dir;
    });
  }, [rows, sort]);

  const sel = rows.find((r) => r.ticker === selected) || null;
  const asOf = dayLabel(rows.find((r) => r.asOf)?.asOf);

  return (
    <div>
      <div className="srl-scroll">
        <table className="srl-table">
          <caption>{p.title || 'Securities in this research'}</caption>
          <thead>
            <tr>
              {COLS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.numeric ? 'is-num' : undefined}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      className="srl-sort"
                      onClick={() =>
                        setSort((s) =>
                          s.key === c.key
                            ? { key: c.key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
                            : { key: c.key, dir: 'desc' },
                        )
                      }
                    >
                      {c.label}
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
            {sorted.map((r) => {
              const isSel = selected === r.ticker;
              const ch = num(r.changePct);
              return (
                <tr key={r.ticker} aria-selected={isSel}>
                  <td>
                    <button
                      type="button"
                      className="srl-row-btn"
                      aria-pressed={isSel}
                      onClick={() => select(r.ticker)}
                    >
                      <span
                        className="is-ticker"
                        style={{ fontFamily: 'var(--srl-mono)', fontWeight: 600 }}
                      >
                        {r.ticker}
                      </span>
                      {r.name ? (
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--srl-faint)' }}>
                          {r.name}
                        </span>
                      ) : null}
                    </button>
                  </td>
                  <td className="is-num">
                    {num(r.price) === null ? (
                      <span className="is-na">N/A</span>
                    ) : (
                      formatFigure(r.price, 'usd')
                    )}
                    {Array.isArray(r.spark) && r.spark.length > 1 ? (
                      <span style={{ display: 'block' }}>
                        <Sparkline values={r.spark} tone="neutral" />
                      </span>
                    ) : null}
                  </td>
                  <td
                    className="is-num"
                    style={{
                      color:
                        ch === null ? undefined : ch >= 0 ? 'var(--srl-pos)' : 'var(--srl-neg)',
                    }}
                  >
                    {formatChange(ch)}
                    {r.period ? (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--srl-faint)' }}>
                        {r.period}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sel ? (
        <div className="srl-tools" style={{ marginTop: 10 }}>
          <span className="srl-labels">
            {sel.relevance ? <span>{sel.relevance}</span> : null}
            {sel.metric?.label ? (
              <span>
                {sel.metric.label}: {formatFigure(sel.metric.value, sel.metric.unit)}
              </span>
            ) : null}
          </span>
          {onAsk ? (
            <button
              type="button"
              className="srl-btn"
              onClick={() => onAsk(`${sel.ticker}: ${p.title || 'research'}`)}
            >
              Ask about {sel.ticker}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
      {asOf ? (
        <p className="srl-labels" style={{ marginTop: 8 }}>
          Prices as of {asOf}
        </p>
      ) : null}
    </div>
  );
}

export default SonarResearchSecuritiesMonitor;
