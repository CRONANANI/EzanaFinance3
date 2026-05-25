'use client';

import { useEffect, useState } from 'react';

const STATEMENT_LABELS = {
  income: 'Income Statement',
  balance: 'Balance Sheet',
  cashflow: 'Cash Flow Statement',
};

export function FinancialStatement({
  symbol,
  statement,
  period = 'annual',
  limit = 2,
  eyebrow,
  caption,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/learning/financial-statement?symbol=${encodeURIComponent(symbol)}&statement=${statement}&period=${period}&limit=${limit}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Fetch failed'))))
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, statement, period, limit]);

  if (loading) {
    return (
      <div className="lc-edit-finstmt lc-edit-finstmt--loading">
        Loading {STATEMENT_LABELS[statement]} for {symbol}…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="lc-edit-finstmt lc-edit-finstmt--error">
        Could not load {STATEMENT_LABELS[statement]} for {symbol}.
      </div>
    );
  }

  return (
    <figure className="lc-edit-finstmt">
      <header className="lc-edit-finstmt-head">
        {eyebrow && (
          <div className="lc-edit-finstmt-eyebrow">
            <i className="bi bi-table" /> {eyebrow}
          </div>
        )}
        <h3 className="lc-edit-finstmt-title">
          {symbol} · {STATEMENT_LABELS[statement]}
        </h3>
      </header>

      <table className="lc-edit-finstmt-table">
        <thead>
          <tr>
            <th className="lc-edit-finstmt-label-col">Line item</th>
            {data.periods.map((p, i) => (
              <th key={i}>{p.label}</th>
            ))}
            {data.periods.length === 2 && <th>YoY Δ</th>}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => {
            if (r.isHeader) {
              return (
                <tr key={i} className="lc-edit-finstmt-section">
                  <td colSpan={data.periods.length + (data.periods.length === 2 ? 2 : 1)}>
                    {r.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={i}
                className={`${r.isTotal ? 'is-total' : ''} ${r.isSubtotal ? 'is-subtotal' : ''}`}
              >
                <td
                  className="lc-edit-finstmt-label"
                  style={{ paddingLeft: `${(r.indent || 0) * 16 + 12}px` }}
                >
                  {r.label}
                </td>
                {r.values.map((v, j) => (
                  <td key={j} className="lc-edit-finstmt-num">
                    {formatValue(v, r.isEps)}
                  </td>
                ))}
                {data.periods.length === 2 && (
                  <td className="lc-edit-finstmt-num lc-edit-finstmt-delta">
                    {formatDelta(r.values, r.isEps)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {caption && <figcaption className="lc-edit-finstmt-caption">{caption}</figcaption>}
    </figure>
  );
}

function formatValue(v, isEps) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (isEps) return `$${v.toFixed(2)}`;
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${v < 0 ? '-' : ''}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${v < 0 ? '-' : ''}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${v < 0 ? '-' : ''}$${(abs / 1e3).toFixed(0)}K`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
}

function formatDelta(values, isEps) {
  if (!Array.isArray(values) || values.length < 2) return '—';
  const [current, prior] = values;
  if (current == null || prior == null || prior === 0) return '—';
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  if (!Number.isFinite(pct)) return '—';
  const sign = pct >= 0 ? '▲' : '▼';
  const color = pct >= 0 ? 'lc-edit-finstmt-pos' : 'lc-edit-finstmt-neg';
  return (
    <span className={color}>
      {sign} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
