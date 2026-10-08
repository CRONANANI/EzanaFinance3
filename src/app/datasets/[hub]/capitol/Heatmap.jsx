'use client';

/**
 * Where oversight and ownership overlap: the share of each full committee's
 * members holding stocks in each sector (inferred holdings). Cells are
 * buttons; arrow keys move across them; the highest share starts selected.
 * The detail box lists the holders and hands the cell to EzanaQL.
 */
import { useEffect, useRef, useState } from 'react';
import { HUB_QUERIES } from '@/lib/datasets/hub-queries';
import { SECTOR_SHORT, heatAlpha } from '@/lib/datasets/capitol-hub/signals';
import { useCwh } from './CwhProvider';
import { PartyTag, SourceFoot } from './bits';
import { DASH, monthDay, pct0 } from './cwh-format';

const CHAMBERS = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];

export default function Heatmap({ house, senate }) {
  const { openMember, requestQuery } = useCwh();
  const [chamber, setChamber] = useState('house');
  const data = chamber === 'senate' ? senate : house;
  const ok = data && !data.error && !data.empty && data.grid?.length;
  const [sel, setSel] = useState(ok ? data.selected : null);
  const cells = useRef({});

  useEffect(() => {
    const d = chamber === 'senate' ? senate : house;
    setSel(d?.selected || null);
  }, [chamber, house, senate]);

  const move = (e, i, j) => {
    const R = data.grid.length;
    const C = data.sectors.length;
    const map = {
      ArrowRight: [i, Math.min(C - 1, j + 1)],
      ArrowLeft: [i, Math.max(0, j - 1)],
      ArrowDown: [Math.min(R - 1, i + 1), j],
      ArrowUp: [Math.max(0, i - 1), j],
    };
    const to = map[e.key];
    if (!to) return;
    e.preventDefault();
    setSel(to);
    cells.current[`${to[0]}-${to[1]}`]?.focus();
  };

  const cell = ok && sel ? data.grid[sel[0]]?.[sel[1]] : null;

  return (
    <section className="cwh-card cwh-heat" aria-labelledby="cwh-heat-h">
      <div className="cwh-mod-head">
        <div>
          <h2 className="cwh-h4" id="cwh-heat-h">
            Where oversight and ownership overlap
          </h2>
          <p className="cwh-caption">
            Share of each committee&apos;s members holding stocks in each sector. Darker means more
            overlap; select a cell for the holders.
          </p>
        </div>
        <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Chamber">
          {CHAMBERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cwh-pill${chamber === c.id ? ' is-active' : ''}`}
              aria-pressed={chamber === c.id}
              onClick={() => setChamber(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {data?.error ? (
        <p className="cwh-empty">
          This signal could not be loaded just now. It refreshes on its own; reload in a minute.
        </p>
      ) : !ok ? (
        <p className="cwh-empty">
          Fills once members of a full committee hold stocks with a mapped sector.
        </p>
      ) : (
        <>
          <div className="cwh-heat-scroll">
            <div
              className="cwh-heat-grid"
              role="grid"
              aria-label={`Committee by sector, ${chamber}`}
              style={{ '--cols': data.sectors.length }}
            >
              <div role="row" className="cwh-heat-row cwh-heat-row--head">
                <span role="columnheader" className="cwh-heat-corner">
                  <span className="cwh-sr">Committee</span>
                </span>
                {data.sectors.map((s) => (
                  <span key={s} role="columnheader" className="cwh-heat-sector" title={s}>
                    {(SECTOR_SHORT[s] || s).toUpperCase()}
                  </span>
                ))}
              </div>
              {data.grid.map((row, i) => (
                <div role="row" key={data.committees[i].id} className="cwh-heat-row">
                  <span role="rowheader" className="cwh-heat-name" title={data.committees[i].name}>
                    {data.committees[i].name}
                  </span>
                  {row.map((c, j) => {
                    const a = heatAlpha(c.share, data.max);
                    const on = sel && sel[0] === i && sel[1] === j;
                    return (
                      <span role="gridcell" key={c.sector} className="cwh-heat-gc">
                        <button
                          ref={(el) => {
                            cells.current[`${i}-${j}`] = el;
                          }}
                          type="button"
                          className={`cwh-heat-cell${on ? ' is-selected' : ''}${a > 0.5 ? ' is-dark' : ''}`}
                          style={{ '--a': `${Math.round(a * 100)}%` }}
                          tabIndex={on || (!sel && i === 0 && j === 0) ? 0 : -1}
                          aria-pressed={on}
                          aria-label={`${c.committee} by ${c.sector}: ${pct0(c.share * 100)}, ${c.holders} of ${c.members} members`}
                          title={`${c.committee} by ${c.sector}: ${pct0(c.share * 100)}`}
                          onClick={() => setSel([i, j])}
                          onKeyDown={(e) => move(e, i, j)}
                        >
                          {pct0(c.share * 100)}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {cell ? (
            <div className="cwh-heat-detail" aria-live="polite">
              <div className="cwh-heat-detail-l">
                <p className="cwh-label">Selected</p>
                <p className="cwh-heat-detail-h">
                  {cell.committee} × {SECTOR_SHORT[cell.sector] || cell.sector}
                </p>
                <p className="cwh-heat-detail-n">
                  <b>{pct0(cell.share * 100)}</b>
                  <span>
                    {cell.holders} of {cell.members} members
                  </span>
                </p>
              </div>
              <div className="cwh-heat-detail-r">
                {cell.holderRows.length ? (
                  <ul className="cwh-holders">
                    {cell.holderRows.slice(0, 5).map((h) => (
                      <li key={h.bioguideId || h.member} className="cwh-holder">
                        <span>
                          {h.bioguideId ? (
                            <button
                              type="button"
                              className="cwh-who-name"
                              onClick={() => openMember(h.bioguideId)}
                            >
                              {h.member}
                            </button>
                          ) : (
                            <b>{h.member}</b>
                          )}{' '}
                          <PartyTag party={h.party} />
                        </span>
                        <span className="cwh-mono cwh-strong cwh-holder-tk">
                          {h.tickers.slice(0, 3).join(', ')}
                          {h.tickers.length > 3 ? ` +${h.tickers.length - 3}` : ''}
                        </span>
                        <span className="cwh-mono cwh-mute cwh-holder-last">
                          LAST {h.lastTrade ? monthDay(h.lastTrade) : DASH}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="cwh-caption">
                    No member of this committee holds a stock in this sector.
                  </p>
                )}
                {cell.holderRows.length > 5 ? (
                  <p className="cwh-caption">and {cell.holderRows.length - 5} more</p>
                ) : null}
                {cell.holderRows.length ? (
                  <button
                    type="button"
                    className="cwh-link-btn"
                    onClick={() =>
                      requestQuery(
                        HUB_QUERIES.tickersHolders(
                          [...new Set(cell.holderRows.flatMap((h) => h.tickers))]
                            .slice(0, 20)
                            .join(','),
                        ),
                        `Holders in ${cell.committee} × ${SECTOR_SHORT[cell.sector] || cell.sector}`,
                      )
                    }
                  >
                    Query this cell
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
      <SourceFoot
        note="Holdings are inferred from disclosures: a purchase not followed by a full sale. Members report up to 45 days late. Full committees of 10 or more members; funds and ETFs are left out."
        window="Holdings today, inferred"
        sources="House Clerk, Senate eFD, congress-legislators"
      />
    </section>
  );
}
