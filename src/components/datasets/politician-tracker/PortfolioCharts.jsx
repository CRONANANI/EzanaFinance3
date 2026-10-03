'use client';

/**
 * A member's estimated open portfolio, in the Politician Tracker panel: the
 * top holdings by estimated size, then the sector breakdown of everything
 * they still hold (/api/politicians/portfolio).
 *
 * Both are ranked bar lists with the value written on each row, so the
 * numbers are readable without hovering and a screen reader gets the same
 * list. One ink, no legend: each list is a single series, named by its
 * heading. Shares are of the member's whole estimated portfolio, so the
 * holdings list and the sector list read on the same scale.
 *
 * ESTIMATES, not holdings: filings report ranges, so each open position is
 * sized from range midpoints (see the 20261003120000 migration) and the
 * section says so under the heading.
 */
import { companyLabel, usdShort } from '@/lib/politicians/tracker-model';

const pct = (s) => {
  const v = (s || 0) * 100;
  if (v > 0 && v < 1) return '<1%';
  return `${Math.round(v)}%`;
};

function Bars({ rows, label }) {
  const max = Math.max(...rows.map((r) => r.share || 0), 0.0001);
  return (
    <ol className="ptk-pf-list" aria-label={label}>
      {rows.map((r) => (
        <li key={r.key} className="ptk-pf-row" aria-label={r.aria}>
          <span className="ptk-pf-name" aria-hidden="true">
            {r.tag ? <b className="dsc-mn ptk-pf-tag">{r.tag}</b> : null}
            <span className="ptk-pf-label">{r.label}</span>
          </span>
          <span className="ptk-pf-track" aria-hidden="true">
            <i style={{ width: `${Math.max(2, ((r.share || 0) / max) * 100)}%` }} />
          </span>
          <span className="ptk-pf-val dsc-mn" aria-hidden="true">
            {pct(r.share)}
            <span className="ptk-pf-usd">{usdShort(r.est)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="ptk-skel ptk-skel--line ptk-skel--row" aria-hidden="true" />
      ))}
    </div>
  );
}

/** state: 'loading' | 'ready' | 'failed' | 'unavailable' */
export default function PortfolioCharts({ state, data }) {
  const holdings = (data?.holdings || []).map((h) => {
    const name = companyLabel(h.company) || h.ticker;
    return {
      key: h.ticker,
      tag: h.ticker,
      label: name,
      share: h.share,
      est: h.est,
      aria: `${h.ticker}, ${name}: about ${pct(h.share)} of the estimated portfolio, ${usdShort(h.est)}, ${h.sector}`,
    };
  });
  const sectors = (data?.sectors || []).map((x) => ({
    key: x.sector,
    label: x.sector,
    share: x.share,
    est: x.est,
    aria: `${x.sector}: about ${pct(x.share)} of the estimated portfolio, ${x.positions} position${
      x.positions === 1 ? '' : 's'
    }`,
  }));

  return (
    <>
      <section className="dsc-p-block ptk-pf" aria-labelledby="ptk-pf-stocks">
        <div className="dsc-p-block-head">
          <span className="dsc-label" id="ptk-pf-stocks">
            Portfolio, top holdings
          </span>
          {state === 'ready' && data?.positions ? (
            <span className="dsc-block-cap">
              {data.stockPositions} stock{data.stockPositions === 1 ? '' : 's'} · est.{' '}
              {usdShort(data.total)}
            </span>
          ) : null}
        </div>
        {state === 'loading' ? (
          <Skeleton />
        ) : state === 'unavailable' ? (
          <p className="dsc-note">Portfolio estimates are not available for sample data.</p>
        ) : state === 'failed' ? (
          <p className="dsc-note" role="status">
            The portfolio estimate is unavailable right now.
          </p>
        ) : holdings.length ? (
          <Bars rows={holdings} label="Top holdings by estimated size" />
        ) : (
          <p className="dsc-note">
            {data?.positions
              ? 'No open stock positions inferred. What they still hold is bonds, Treasuries or other assets without a ticker.'
              : 'No open positions inferred from the disclosures on file.'}
          </p>
        )}
      </section>

      <section className="dsc-p-block ptk-pf" aria-labelledby="ptk-pf-sectors">
        <div className="dsc-p-block-head">
          <span className="dsc-label" id="ptk-pf-sectors">
            Sector breakdown
          </span>
          {state === 'ready' && data?.positions ? (
            <span className="dsc-block-cap">
              {data.positions} open position{data.positions === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {state === 'loading' ? (
          <Skeleton />
        ) : state === 'ready' && sectors.length ? (
          <Bars rows={sectors} label="Estimated portfolio by sector" />
        ) : state === 'ready' ? (
          <p className="dsc-note">Nothing to break down yet.</p>
        ) : null}
        {state === 'ready' && data?.positions ? (
          <p className="ptk-note">
            Estimated, not reported: positions still open on the disclosures, sized from the
            midpoints of disclosed ranges (buys minus partial sales since the last full sale). No
            market prices applied.
          </p>
        ) : null}
      </section>
    </>
  );
}
