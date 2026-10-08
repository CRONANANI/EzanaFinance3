'use client';

/**
 * Congress's portfolio, compared: an area-proportional Venn of the stocks
 * side A and side B hold (inferred open positions), the overlap, and the most
 * widely held tickers in the selected region. Regions are focusable buttons
 * (Enter or Space selects); the region pills mirror them for anyone who
 * prefers a list. Shared tickers show a split bar, side A on the left.
 */
import { useMemo } from 'react';
import { useCwh } from './CwhProvider';
import { count } from './cwh-format';
import { vennLayout } from './venn-geometry';

const W = 420;
const H = 250;

function RegionList({ region, rows, sides }) {
  const { openCompany } = useCwh();
  if (!rows.length) {
    return <p className="cwh-caption">No tickers in this region.</p>;
  }
  return (
    <ol className="cwh-venn-list">
      {rows.map((r) => {
        const total = r.a + r.b;
        return (
          <li key={r.ticker}>
            <button
              type="button"
              className="cwh-venn-row"
              data-ticker={r.ticker}
              onClick={() => openCompany({ ticker: r.ticker })}
              aria-label={`${r.ticker}: ${r.a} ${sides.a.short}, ${r.b} ${sides.b.short}`}
            >
              <span className="cwh-mono cwh-strong">{r.ticker}</span>
              <span className="cwh-venn-sector cwh-mute">{r.sector || ''}</span>
              {region === 'both' ? (
                <span className="cwh-venn-split" aria-hidden="true">
                  <i className={`is-${sides.a.key}`} style={{ width: `${(r.a / total) * 100}%` }} />
                  <i className={`is-${sides.b.key}`} style={{ width: `${(r.b / total) * 100}%` }} />
                </span>
              ) : (
                <span />
              )}
              <span className="cwh-mono cwh-venn-n">
                {region === 'both' ? (
                  <>
                    <b>{r.a}</b>
                    <span className="cwh-faint"> / </span>
                    <b>{r.b}</b>
                  </>
                ) : (
                  <b>{total}</b>
                )}{' '}
                <span className="cwh-faint">members</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function PortfolioVenn({ data, sides, region, onRegion }) {
  const regions = data?.regions;
  const n = {
    a: regions?.a?.count || 0,
    both: regions?.both?.count || 0,
    b: regions?.b?.count || 0,
  };
  const layout = useMemo(
    () => vennLayout(n.a, n.both, n.b, { width: W, height: H }),
    [n.a, n.both, n.b],
  );
  const names = {
    a: `Only ${sides.a.label}`,
    both: 'Both',
    b: `Only ${sides.b.label}`,
  };
  const order = ['a', 'both', 'b'];

  const key = (id) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRegion(id);
    }
  };

  return (
    <div className="cwh-venn">
      <div className="cwh-venn-fig">
        {layout ? (
          <svg
            className="cwh-venn-svg"
            viewBox={`0 0 ${W} ${H}`}
            role="group"
            aria-label={`${sides.a.label} and ${sides.b.label}: ${n.a} tickers held only by ${sides.a.label}, ${n.both} by both, ${n.b} only by ${sides.b.label}`}
          >
            {order.map((id) =>
              layout.paths[id] ? (
                <path
                  key={id}
                  d={layout.paths[id]}
                  fillRule={layout.evenodd ? 'evenodd' : undefined}
                  className={`cwh-venn-region is-${id === 'both' ? 'both' : sides[id].key}${region === id ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={region === id}
                  aria-label={`${names[id]}: ${count(n[id])} tickers`}
                  onClick={() => onRegion(id)}
                  onKeyDown={key(id)}
                >
                  <title>{`${names[id]}: ${count(n[id])} tickers`}</title>
                </path>
              ) : null,
            )}
            {order.map((id) =>
              layout.paths[id] ? (
                <text
                  key={`t-${id}`}
                  x={layout.label[id].x}
                  y={layout.label[id].y}
                  className="cwh-venn-count"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  aria-hidden="true"
                >
                  {count(n[id])}
                </text>
              ) : null,
            )}
          </svg>
        ) : (
          <p className="cwh-empty">No inferred open positions on either side.</p>
        )}
        {data?.groups ? (
          <p className="cwh-venn-legend">
            <span>
              <i className={`cwh-venn-key is-${sides.a.key}`} aria-hidden="true" />
              {sides.a.label}: <b className="cwh-mono">{count(data.groups.a?.members)}</b> members,{' '}
              <b className="cwh-mono">{count(data.groups.a?.tickers)}</b> tickers
            </span>
            <span>
              <i className={`cwh-venn-key is-${sides.b.key}`} aria-hidden="true" />
              {sides.b.label}: <b className="cwh-mono">{count(data.groups.b?.members)}</b> members,{' '}
              <b className="cwh-mono">{count(data.groups.b?.tickers)}</b> tickers
            </span>
          </p>
        ) : null}
      </div>

      <div className="cwh-venn-side">
        <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Venn region">
          {order.map((id) => (
            <button
              key={id}
              type="button"
              className={`cwh-pill${region === id ? ' is-active' : ''}`}
              aria-pressed={region === id}
              onClick={() => onRegion(id)}
            >
              {names[id]} <span className="cwh-mono">{count(n[id])}</span>
            </button>
          ))}
        </div>
        <p className="cwh-label cwh-venn-h">
          Most widely held, {names[region].toLowerCase()}
          {region === 'both' ? (
            <span className="cwh-faint">
              {' '}
              ({sides.a.short} / {sides.b.short})
            </span>
          ) : null}
        </p>
        <RegionList region={region} rows={regions?.[region]?.top || []} sides={sides} />
      </div>
    </div>
  );
}
