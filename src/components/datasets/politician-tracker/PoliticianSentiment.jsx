'use client';

/**
 * Politician sentiment (Nov 18 2026). Whether members of Congress, by what
 * they disclose buying and selling, read the market as bull or bear: every
 * year on file, then the chosen year by sector. Data from
 * /api/politicians/sentiment; rules in lib/politicians/sentiment.js.
 *
 * Flat canvas: diverging bars around the 50% line (right of it, more members
 * net buying; left, more net selling), hairlines between rows, emerald and
 * red text for the reading, no cards or pills.
 */
import { useEffect, useState } from 'react';
import { BEAR_AT, BULL_AT, OUTLOOK_BAND, OUTLOOK_WEIGHTS } from '@/lib/politicians/sentiment';

const pct = (v, d = 0) => (Number.isFinite(v) ? `${v.toFixed(d)}%` : 'n/a');
const signedPct = (v) =>
  Number.isFinite(v) ? `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(0)}%` : 'n/a';
const usdShort = (v) => {
  const n = Math.abs(v);
  if (n >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

/* Bar from the 50% line toward breadth: right for net buying, left for net
   selling, as a share of the half width. */
function Lean({ breadth }) {
  if (!Number.isFinite(breadth)) return <span className="pts-lean" aria-hidden="true" />;
  const off = Math.min(50, Math.abs(breadth - 50));
  const up = breadth >= 50;
  return (
    <span className="pts-lean" aria-hidden="true">
      <span className="pts-lean-mid" />
      <span
        className={`pts-lean-bar ${up ? 'is-bull' : 'is-bear'}`}
        style={up ? { left: '50%', width: `${off}%` } : { right: '50%', width: `${off}%` }}
      />
    </span>
  );
}

export default function PoliticianSentiment() {
  const [year, setYear] = useState(null);
  const [state, setState] = useState({ status: 'loading', years: [], sectors: [], year: null });

  useEffect(() => {
    const ctrl = new AbortController();
    const qs = year ? `?year=${year}` : '';
    setState((s) => ({ ...s, status: s.years.length ? 'refreshing' : 'loading' }));
    fetch(`/api/politicians/sentiment${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) {
          setState((s) => ({ ...s, status: 'error' }));
          return;
        }
        setState({ status: 'ready', years: d.years, sectors: d.sectors, year: d.year });
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState((s) => ({ ...s, status: 'error' }));
      });
    return () => ctrl.abort();
  }, [year]);

  const { years, sectors, status } = state;
  const shownYear = state.year;
  const cur = years.find((y) => y.year === shownYear) || null;
  const thisYear = new Date().getFullYear();
  const named = sectors.filter((s) => s.sector !== 'Unclassified');
  const unclassified = sectors.find((s) => s.sector === 'Unclassified');

  return (
    <section className="pts" aria-labelledby="pts-title">
      <div className="pts-head">
        <p className="ptk-eyebrow dsc-mn">POLITICIAN SENTIMENT</p>
        <h2 className="pts-title" id="pts-title">
          Bull or bear, by what Congress buys and sells
        </h2>
        <p className="pts-lead">
          Each year, the share of trading members who bought more than they sold, by disclosed
          dollars. {BULL_AT}% or more reads Bullish, {BEAR_AT}% or less reads Bearish.
        </p>
      </div>

      {status === 'error' && !years.length ? (
        <p className="dsc-note" role="status">
          Sentiment could not be loaded. Try again shortly.
        </p>
      ) : status === 'loading' && !years.length ? (
        <p className="pts-loading" role="status">
          Loading every year on file…
        </p>
      ) : cur ? (
        <>
          {/* The chosen year's reading. */}
          <div className="pts-now" aria-live="polite">
            <div className="pts-now-main">
              <span className="pts-now-year dsc-mn">
                {cur.year}
                {cur.year === thisYear ? ' · year to date' : ''}
              </span>
              <span className={`pts-now-reading is-${cur.reading.key}`}>{cur.reading.label}</span>
              <span className="pts-now-line">
                {pct(cur.breadth)} of members were net buyers ({cur.netBuyers} of{' '}
                {cur.netBuyers + cur.netSellers})
              </span>
            </div>
            <dl className="pts-now-figs">
              <div>
                <dt>Buys, share of trades</dt>
                <dd className="dsc-mn">{pct(cur.buyShare)}</dd>
              </div>
              <div>
                <dt>Net flow, by dollars</dt>
                <dd className={`dsc-mn ${cur.netFlow >= 0 ? 'is-bull' : 'is-bear'}`}>
                  {signedPct(cur.netFlow)}
                </dd>
              </div>
              <div>
                <dt>Bought / sold</dt>
                <dd className="dsc-mn">
                  {usdShort(cur.buyUsd)} / {usdShort(cur.sellUsd)}
                </dd>
              </div>
              <div>
                <dt>Disclosed trades</dt>
                <dd className="dsc-mn">{cur.trades.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          {/* Economic outlook: breadth plus where the money went. */}
          {cur.outlook ? (
            <div className="pts-outlook" aria-live="polite">
              <div className="pts-outlook-main">
                <span className="ptk-eyebrow dsc-mn">ECONOMIC OUTLOOK, {cur.year}</span>
                <span className={`pts-outlook-label is-${cur.outlook.key}`}>
                  {cur.outlook.label}
                </span>
                <span className="pts-now-line">
                  Score{' '}
                  <span className="dsc-mn">
                    {Number.isFinite(cur.outlook.score)
                      ? `${cur.outlook.score >= 0 ? '+' : '-'}${Math.abs(cur.outlook.score).toFixed(0)}`
                      : 'n/a'}
                  </span>{' '}
                  on a scale of -100 to +100
                </span>
              </div>
              {cur.rotation ? (
                <dl className="pts-now-figs">
                  <div>
                    <dt>Market lean ({Math.round(OUTLOOK_WEIGHTS.lean * 100)}%)</dt>
                    <dd className="dsc-mn">
                      {Number.isFinite(cur.outlook.lean)
                        ? `${cur.outlook.lean >= 0 ? '+' : '-'}${Math.abs(cur.outlook.lean).toFixed(0)}`
                        : 'n/a'}
                    </dd>
                  </div>
                  <div>
                    <dt>Rotation to safety ({Math.round(OUTLOOK_WEIGHTS.rotation * 100)}%)</dt>
                    <dd
                      className={`dsc-mn ${
                        (cur.rotation.tilt ?? 0) > 0 ? 'is-bear' : 'is-bull'
                      }`}
                    >
                      {Number.isFinite(cur.rotation.tilt)
                        ? `${cur.rotation.tilt >= 0 ? '+' : '-'}${Math.abs(cur.rotation.tilt).toFixed(1)} pts`
                        : 'n/a'}
                    </dd>
                  </div>
                  <div>
                    <dt>Safe share of buys</dt>
                    <dd className="dsc-mn">{pct(cur.rotation.safeBuyShare)}</dd>
                  </div>
                  <div>
                    <dt>Safe share of sells</dt>
                    <dd className="dsc-mn">{pct(cur.rotation.safeSellShare)}</dd>
                  </div>
                </dl>
              ) : null}
              {cur.rotation ? (
                <ul className="pts-rows pts-buckets">
                  {[
                    ['Bonds and Treasuries', 'safe', cur.rotation.bonds],
                    ['Defensive sectors', 'safe', cur.rotation.defensive],
                    ['Cyclical sectors', 'growth', cur.rotation.cyclical],
                  ].map(([label, kind, b]) => {
                    const total = b.buys + b.sells;
                    const share = total > 0 ? (b.buys / total) * 100 : null;
                    return (
                      <li key={label} className="pts-row pts-row--static">
                        <span className="pts-row-label">
                          {label}
                          <span className="pts-bucket-kind"> · {kind}</span>
                        </span>
                        <Lean breadth={share} />
                        <span className="pts-row-fig dsc-mn">{pct(share)}</span>
                        <span className="pts-row-sub dsc-mn">
                          {b.buys.toLocaleString()} / {b.sells.toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <p className="ptk-note">
                Money moving into bonds, Treasuries and the defensive sectors (Consumer Staples,
                Utilities, Health Care) reads as bracing for a slowdown; money moving into cyclical
                sectors, Consumer Discretionary among them, reads as expecting growth. Rotation to
                safety is the safe share of buys minus the safe share of sells, by trade count.
                The score weighs market lean {Math.round(OUTLOOK_WEIGHTS.lean * 100)}% and rotation{' '}
                {Math.round(OUTLOOK_WEIGHTS.rotation * 100)}%; +{OUTLOOK_BAND} or more reads
                Expansion, -{OUTLOOK_BAND} or less Slowdown risk. Bars show buys as a share of each
                group&apos;s trades (buys / sells on the right).
              </p>
            </div>
          ) : null}

          <div className="pts-cols">
            {/* Every year on file. A row picks the year for the sectors. */}
            <div className="pts-block">
              <div className="pts-block-head">
                <h3 className="ptk-eyebrow dsc-mn">BY YEAR</h3>
                <span className="ptk-cap">net selling · 50% · net buying</span>
              </div>
              <ul className="pts-rows">
                {[...years].reverse().map((y) => (
                  <li key={y.year}>
                    <button
                      type="button"
                      className={`pts-row${y.year === shownYear ? ' is-on' : ''}`}
                      aria-pressed={y.year === shownYear}
                      onClick={() => setYear(y.year)}
                    >
                      <span className="pts-row-label dsc-mn">{y.year}</span>
                      <Lean breadth={y.breadth} />
                      <span className="pts-row-fig dsc-mn">{pct(y.breadth)}</span>
                      <span className={`pts-row-reading is-${y.reading.key}`}>
                        {y.reading.label}
                        {y.outlook && y.outlook.key !== 'none' ? (
                          <span className={`pts-row-outlook is-${y.outlook.key}`}>
                            {y.outlook.label}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* The chosen year by sector. */}
            <div className="pts-block">
              <div className="pts-block-head">
                <h3 className="ptk-eyebrow dsc-mn">BY SECTOR, {shownYear}</h3>
                <span className="ptk-cap">members net buying · buys of trades</span>
              </div>
              {named.length ? (
                <ul className="pts-rows">
                  {named.map((s) => (
                    <li key={s.sector} className="pts-row pts-row--static">
                      <span className="pts-row-label">{s.sector}</span>
                      <Lean breadth={s.breadth} />
                      <span className="pts-row-fig dsc-mn">{pct(s.breadth)}</span>
                      <span className="pts-row-sub dsc-mn">
                        {pct(s.buyShare)} · {s.trades.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dsc-note">No sector data for {shownYear}.</p>
              )}
              {unclassified ? (
                <p className="ptk-note">
                  {unclassified.trades.toLocaleString()} trades in {shownYear} are in funds,
                  bonds or tickers without a sector on file and are left out of this list.
                </p>
              ) : null}
            </div>
          </div>

          <p className="ptk-note">
            Buys are purchases; sells are full and partial sales; exchanges are left out. Dollars
            are the midpoints of disclosed ranges. Members may file up to 45 days after a trade, so
            the latest weeks fill in over time. A reading of what members did, not investment
            advice.
          </p>
        </>
      ) : (
        <p className="dsc-note">No disclosures on file yet.</p>
      )}
    </section>
  );
}
