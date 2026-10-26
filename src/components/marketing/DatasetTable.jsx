'use client';

/**
 * DatasetTable — one accessible, branded table shared by every public
 * /datasets dimension page. Columns describe the shape; optional per-column
 * `render(value, row)` hooks return badge / mono cells. Numeric, ticker and
 * date cells should be flagged `mono` so they pick up JetBrains Mono +
 * tabular-nums per the branding guide.
 *
 * Props:
 *  - columns: [{ key, label, align?, mono?, render? }]
 *  - rows:    array of plain objects keyed by column.key
 *  - emptyText: shown when rows is empty (e.g. after a search filter)
 *  - onRowClick(row): optional — when provided, rows that carry an `awardId`
 *      become keyboard-accessible buttons (Enter/Space) that call it.
 *  - getRowLabel(row): optional aria-label for a clickable row.
 *  - isRowClickable(row): optional — overrides the `awardId` rule for pages
 *      whose rows are all interactive (e.g. Global Empire Rankings).
 *  - rowClassName(row): optional extra class for a row (e.g. a highlight).
 *  - ariaLabel: the scroll region's label (default "Dataset table").
 *  Rows with an `id` carry it as data-row-id, so a page can find and scroll
 *  to one.
 */
const hasAwardId = (row) => !!row.awardId;

export function DatasetTable({
  columns,
  rows,
  emptyText = 'No matching records.',
  onRowClick,
  getRowLabel,
  isRowClickable = hasAwardId,
  rowClassName,
  ariaLabel = 'Dataset table',
}) {
  return (
    <div className="mkt-ds-table-wrap" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="mkt-ds-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.align ? { textAlign: col.align } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="mkt-ds-empty" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              // By default only rows with an awardId are interactive — the
              // static sample fallback (no awardId) stays a plain row.
              const clickable = typeof onRowClick === 'function' && isRowClickable(row);
              const cls = [clickable ? 'mkt-ds-row-clickable' : '', rowClassName?.(row) || '']
                .filter(Boolean)
                .join(' ');
              return (
                <tr
                  key={row.id ?? i}
                  data-row-id={row.id ?? undefined}
                  className={cls || undefined}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? 'button' : undefined}
                  aria-label={
                    clickable ? (getRowLabel ? getRowLabel(row) : 'View details') : undefined
                  }
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.mono ? 'mkt-ds-mono' : undefined}
                      style={col.align ? { textAlign: col.align } : undefined}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Shared cell renderers (token-driven, no hardcoded color) ── */

export function Ticker({ symbol }) {
  return <span className="mkt-ds-ticker">{symbol}</span>;
}

/** Party initial badge: Democrat → blue, Republican → red, else neutral. */
export function PartyBadge({ party }) {
  const p = String(party || '').toLowerCase();
  const cls = p.startsWith('d') ? 'is-dem' : p.startsWith('r') ? 'is-rep' : 'is-ind';
  const short = p.startsWith('d') ? 'D' : p.startsWith('r') ? 'R' : 'I';
  return (
    <span className={`mkt-ds-badge ${cls}`} title={party || 'Independent'}>
      {short}
    </span>
  );
}

/** Transaction badge: Purchase/Buy → positive, Sale/Sell → negative. */
export function TxnBadge({ type }) {
  const isSell = /sell|sale|sold|disposal/i.test(String(type || ''));
  return <span className={`mkt-ds-badge ${isSell ? 'is-sell' : 'is-buy'}`}>{type}</span>;
}

/** Politician name + party badge + chamber meta. */
export function PoliticianCell({ row }) {
  return (
    <span className="mkt-ds-pol">
      <PartyBadge party={row.party} />
      <span className="mkt-ds-pol-name">{row.politician}</span>
      {row.chamber ? <span className="mkt-ds-pol-meta">{row.chamber}</span> : null}
    </span>
  );
}

/** Emphasized entity name (recipient / insider / event / person). */
export function EntityName({ children }) {
  return <span className="mkt-ds-entity">{children}</span>;
}

/** Rating / sentiment pill: Buy·Bullish → positive, Sell·Bearish → negative,
 *  anything else (Hold·Neutral) → neutral. */
export function SentimentBadge({ value }) {
  const v = String(value || '').toLowerCase();
  const isPos = /buy|bull|positive|overweight|gain/.test(v);
  const isNeg = /sell|bear|negative|underweight|loss/.test(v);
  const cls = isPos ? 'is-buy' : isNeg ? 'is-sell' : 'is-ind';
  return <span className={`mkt-ds-badge ${cls}`}>{value}</span>;
}

/** Signed percentage return, colored positive/negative. */
export function ReturnValue({ value, digits = 1 }) {
  if (value == null || value === '') return <span className="mkt-ds-muted">—</span>;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span className="mkt-ds-muted">{value}</span>;
  const pos = n >= 0;
  return (
    <span className={pos ? 'mkt-ds-pos' : 'mkt-ds-neg'}>
      {pos ? '+' : ''}
      {n.toFixed(digits)}%
    </span>
  );
}
