'use client';

/**
 * Politician sentiment: Bull or bear, by what Congress buys and sells
 * (Nov 18 2026; moved up and enriched in the tracker redesign). Whether
 * members of Congress, by what they disclose buying and selling, read the
 * market as bull or bear: the chosen year's reading, what the three
 * measures say together, the economic outlook heuristic, every year on file
 * and the chosen year by sector. Data from /api/politicians/sentiment; rules
 * in lib/politicians/sentiment.js (unchanged: 55% / 45% breadth thresholds,
 * outlook 0.6 lean - 0.4 rotation, band +/-8).
 *
 * Flat canvas: a breadth spectrum with the 45% and 55% marks, diverging bars
 * around the 50% line, hairlines between rows, emerald and red text for the
 * reading, no cards or pills.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BEAR_AT,
  BULL_AT,
  OUTLOOK_BAND,
  OUTLOOK_WEIGHTS,
  SAFE_SECTORS,
  sectorShifts,
  signalStory,
} from '@/lib/politicians/sentiment';

const pct = (v, d = 0) => (Number.isFinite(v) ? `${v.toFixed(d)}%` : 'n/a');
const signed = (v, d = 0, unit = '') =>
  Number.isFinite(v) ? `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(d)}${unit}` : 'n/a';
const usdShort = (v) => {
  const n = Math.abs(v);
  if (n >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};
const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
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

/* The reading on its own scale: member breadth from 0% to 100%, with the
   Bearish (45% or less) and Bullish (55% or more) marks. */
function Spectrum({ breadth, reading }) {
  const at = Number.isFinite(breadth) ? Math.max(0, Math.min(100, breadth)) : null;
  return (
    <div className="pts-spec">
      <div className="pts-spec-head">
        <span className="pts-spec-title">Congress trade signal</span>
        <span className="pts-spec-cap">share of leaning members who were net buyers</span>
      </div>
      <div
        className="pts-spec-track"
        role="img"
        aria-label={
          at == null
            ? 'Not enough data for a reading'
            : `${pct(at)} of members net buying: ${reading}. Bearish at ${BEAR_AT}% or less, Bullish at ${BULL_AT}% or more.`
        }
      >
        <span className="pts-spec-zone is-bear" style={{ left: 0, width: `${BEAR_AT}%` }} />
        <span
          className="pts-spec-zone is-neutral"
          style={{ left: `${BEAR_AT}%`, width: `${BULL_AT - BEAR_AT}%` }}
        />
        <span
          className="pts-spec-zone is-bull"
          style={{ left: `${BULL_AT}%`, width: `${100 - BULL_AT}%` }}
        />
        <span className="pts-spec-tick" style={{ left: `${BEAR_AT}%` }} />
        <span className="pts-spec-tick" style={{ left: '50%' }} />
        <span className="pts-spec-tick" style={{ left: `${BULL_AT}%` }} />
        {at != null ? (
          <span className="pts-spec-mark" style={{ left: `${at}%` }}>
            <span className="pts-spec-mark-val dsc-mn">{pct(at)}</span>
          </span>
        ) : null}
      </div>
      <div className="pts-spec-scale dsc-mn" aria-hidden="true">
        <span style={{ left: 0 }}>0%</span>
        <span className="is-bear" style={{ left: `${BEAR_AT}%` }}>
          {BEAR_AT}%
        </span>
        <span className="is-bull" style={{ left: `${BULL_AT}%` }}>
          {BULL_AT}%
        </span>
        <span style={{ left: '100%' }}>100%</span>
      </div>
      <div className="pts-spec-legend">
        <span className="is-bear">Bearish: {BEAR_AT}% or less</span>
        <span className="is-neutral">Neutral: between</span>
        <span className="is-bull">Bullish: {BULL_AT}% or more</span>
      </div>
    </div>
  );
}

/* Rotation to safety as a signed meter: right of centre is money tilting to
   safety (bonds and defensive sectors), left is tilting to cyclicals. The
   scale is +/-25 percentage points, the range where the outlook's rotation
   term reaches its +/-100 cap (rotation x 4). */
function RotationMeter({ tilt }) {
  const cap = 25;
  const v = Number.isFinite(tilt) ? Math.max(-cap, Math.min(cap, tilt)) : null;
  const w = v == null ? 0 : (Math.abs(v) / cap) * 50;
  return (
    <div className="pts-rot">
      <div
        className="pts-rot-track"
        role="img"
        aria-label={
          v == null
            ? 'Rotation not available'
            : `Rotation ${signed(tilt, 1, ' points')}: ${tilt > 0 ? 'toward safety' : tilt < 0 ? 'toward cyclicals' : 'balanced'}`
        }
      >
        <span className="pts-rot-mid" />
        {v != null ? (
          <span
            className={`pts-rot-bar ${v > 0 ? 'is-safe' : 'is-growth'}`}
            style={v > 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
          />
        ) : null}
      </div>
      <div className="pts-rot-scale" aria-hidden="true">
        <span>Toward cyclicals</span>
        <span className="dsc-mn">0</span>
        <span>Toward safety</span>
      </div>
    </div>
  );
}

const SECTOR_SORTS = [
  { value: 'breadth', label: 'Net buying' },
  { value: 'buyShare', label: 'Buy share' },
  { value: 'trades', label: 'Trades' },
  { value: 'change', label: 'Change' },
];

export default function PoliticianSentiment() {
  const [year, setYear] = useState(null);
  const [sectorSort, setSectorSort] = useState('trades');
  const [state, setState] = useState({
    status: 'loading',
    years: [],
    sectors: [],
    prevSectors: null,
    latestTrade: null,
    year: null,
  });

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
        setState({
          status: 'ready',
          years: d.years,
          sectors: d.sectors,
          prevSectors: d.prevSectors || null,
          latestTrade: d.latestTrade || null,
          year: d.year,
        });
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState((s) => ({ ...s, status: 'error' }));
      });
    return () => ctrl.abort();
  }, [year]);

  const { years, sectors, prevSectors, latestTrade, status } = state;
  const shownYear = state.year;
  const cur = years.find((y) => y.year === shownYear) || null;
  const thisYear = new Date().getFullYear();
  const story = useMemo(() => signalStory(cur), [cur]);
  const shifts = useMemo(() => sectorShifts(sectors, prevSectors), [sectors, prevSectors]);
  const hasChange = shifts.byChange.size > 0;
  const named = useMemo(() => {
    const rows = sectors.filter((s) => s.sector !== 'Unclassified');
    const key = sectorSort === 'change' && !hasChange ? 'trades' : sectorSort;
    const val = (s) =>
      key === 'change' ? (shifts.byChange.get(s.sector) ?? -Infinity) : (s[key] ?? -Infinity);
    return [...rows].sort((a, b) => val(b) - val(a) || a.sector.localeCompare(b.sector));
  }, [sectors, sectorSort, shifts, hasChange]);
  const unclassified = sectors.find((s) => s.sector === 'Unclassified');
  const leaning = cur ? cur.netBuyers + cur.netSellers : 0;
  const ytd = cur && cur.year === thisYear;

  return (
    <section className="pts" aria-labelledby="pts-title">
      {/* The headline (reading, what it says, the signal bar) sits beside
          the tracker's rail under the table; the rest runs full width. */}
      <div className="pts-top">
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
          {/* ── the chosen year's reading and what it is telling us ── */}
          <div className="pts-signal" aria-live="polite">
            <div className="pts-now-main">
              <span className="pts-now-year dsc-mn">
                {cur.year}
                {ytd ? ' · YEAR TO DATE' : ''}
              </span>
              <span className={`pts-now-reading is-${cur.reading.key}`}>{cur.reading.label}</span>
              <span className="pts-now-line">
                {cur.netBuyers.toLocaleString()} of {leaning.toLocaleString()} members net buying
              </span>
            </div>
            {story ? (
              <div className="pts-story">
                <span className="pts-story-label dsc-mn">WHAT THE SIGNAL IS TELLING US</span>
                <p className="pts-story-main">{story.summary}</p>
                {story.aligned ? <p className="pts-story-sub">{story.aligned}</p> : null}
                {story.divergence.map((d) => (
                  <p key={d} className="pts-story-sub pts-story-div">
                    <span className="pts-story-tag dsc-mn">SIGNAL DIVERGENCE</span> {d}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <dl className="pts-now-figs">
            <div>
              <dt>Members net buying</dt>
              <dd className={`dsc-mn is-${cur.reading.key}`}>{pct(cur.breadth)}</dd>
            </div>
            <div>
              <dt>Buys, share of trades</dt>
              <dd className="dsc-mn">{pct(cur.buyShare)}</dd>
            </div>
            <div>
              <dt>Net flow, by dollars</dt>
              <dd className={`dsc-mn ${cur.netFlow >= 0 ? 'is-bull' : 'is-bear'}`}>
                {signed(cur.netFlow, 0, '%')}
              </dd>
            </div>
            <div>
              <dt>Bought / sold, midpoints</dt>
              <dd className="dsc-mn">
                {usdShort(cur.buyUsd)} / {usdShort(cur.sellUsd)}
              </dd>
            </div>
            <div>
              <dt>Buy / sell trades</dt>
              <dd className="dsc-mn">
                {cur.buys.toLocaleString()} / {cur.sells.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Disclosed trades</dt>
              <dd className="dsc-mn">{cur.trades.toLocaleString()}</dd>
            </div>
          </dl>

          <Spectrum breadth={cur.breadth} reading={cur.reading.label} />
        </>
      ) : (
        <p className="dsc-note">No disclosures on file yet.</p>
      )}
      </div>

      {cur ? (
        <div className="pts-rest">

          {/* ── economic outlook: a separate heuristic on its own scale ── */}
          {cur.outlook ? (
            <div className="pts-outlook" aria-live="polite">
              <div className="pts-outlook-main">
                <span className="ptk-eyebrow dsc-mn">ECONOMIC OUTLOOK, {cur.year}</span>
                <span className={`pts-outlook-label is-${cur.outlook.key}`}>
                  {cur.outlook.label}
                </span>
                <span className="pts-now-line">
                  Score <span className="dsc-mn">{signed(cur.outlook.score)}</span> on a scale of
                  -100 to +100
                </span>
                <span className="pts-heuristic">
                  A heuristic derived from congressional disclosures, not a forecast of growth or
                  markets.
                </span>
              </div>
              {cur.rotation ? (
                <div className="pts-outlook-parts">
                  <dl className="pts-now-figs pts-now-figs--4">
                    <div>
                      <dt>Market lean ({Math.round(OUTLOOK_WEIGHTS.lean * 100)}%)</dt>
                      <dd className="dsc-mn">{signed(cur.outlook.lean)}</dd>
                    </div>
                    <div>
                      <dt>Rotation to safety ({Math.round(OUTLOOK_WEIGHTS.rotation * 100)}%)</dt>
                      <dd
                        className={`dsc-mn ${(cur.rotation.tilt ?? 0) > 0 ? 'is-bear' : 'is-bull'}`}
                      >
                        {signed(cur.rotation.tilt, 1, ' pts')}
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
                  <RotationMeter tilt={cur.rotation.tilt} />
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
                </div>
              ) : null}
              <p className="ptk-note pts-outlook-note">
                Money moving into bonds, Treasuries and the defensive sectors (
                {SAFE_SECTORS.join(', ')}) reads as bracing for a slowdown; money moving into
                cyclical sectors, Consumer Discretionary among them, reads as expecting growth.
                Rotation to safety is the safe share of buys minus the safe share of sells, by
                trade count. The score weighs market lean {Math.round(OUTLOOK_WEIGHTS.lean * 100)}%
                and rotation {Math.round(OUTLOOK_WEIGHTS.rotation * 100)}%; +{OUTLOOK_BAND} or more
                reads Expansion, -{OUTLOOK_BAND} or less Slowdown risk. Bucket bars show buys as a
                share of each group&apos;s trades (buys / sells on the right).
              </p>
            </div>
          ) : null}

          {/* ── what moved, same definitions both years ── */}
          {shifts.falls.length || shifts.defensive.length ? (
            <div className="pts-moves">
              {shifts.falls.length ? (
                <div className="pts-move">
                  <span className="pts-move-head is-bear">
                    <i className="bi bi-arrow-down-right" aria-hidden="true" /> Rotating away from
                  </span>
                  <span className="pts-move-cap">
                    Largest falls in members net buying, {shownYear} against {shownYear - 1}
                  </span>
                  <ul className="pts-move-list">
                    {shifts.falls.map((m) => (
                      <li key={m.sector}>
                        <span>{m.sector}</span>
                        <span className="dsc-mn is-bear">{signed(m.change, 0, ' pts')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {shifts.rises.length ? (
                <div className="pts-move">
                  <span className="pts-move-head is-bull">
                    <i className="bi bi-arrow-up-right" aria-hidden="true" /> Rotating toward
                  </span>
                  <span className="pts-move-cap">
                    Largest rises in members net buying, {shownYear} against {shownYear - 1}
                  </span>
                  <ul className="pts-move-list">
                    {shifts.rises.map((m) => (
                      <li key={m.sector}>
                        <span>{m.sector}</span>
                        <span className="dsc-mn is-bull">{signed(m.change, 0, ' pts')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {shifts.defensive.length ? (
                <div className="pts-move">
                  <span className="pts-move-head">
                    <i className="bi bi-shield" aria-hidden="true" /> Defensive buying
                  </span>
                  <span className="pts-move-cap">
                    Buys as a share of trades in the defensive sectors, {shownYear}
                  </span>
                  <ul className="pts-move-list">
                    {shifts.defensive.map((s) => (
                      <li key={s.sector}>
                        <span>{s.sector}</span>
                        <span className="dsc-mn">{pct(s.buyShare)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
                <span className="pts-sort" role="group" aria-label="Sort sectors by">
                  {SECTOR_SORTS.filter((o) => o.value !== 'change' || hasChange).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={`pts-sort-btn${sectorSort === o.value ? ' is-on' : ''}`}
                      aria-pressed={sectorSort === o.value}
                      onClick={() => setSectorSort(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </span>
              </div>
              <div className="pts-sector-cols dsc-mn" aria-hidden="true">
                <span>SECTOR</span>
                <span />
                <span>NET BUYING</span>
                <span>BUYS · TRADES{hasChange ? ' · CHANGE' : ''}</span>
              </div>
              {named.length ? (
                <ul className="pts-rows">
                  {named.map((s) => {
                    const ch = shifts.byChange.get(s.sector);
                    return (
                      <li key={s.sector} className="pts-row pts-row--static">
                        <span className="pts-row-label">{s.sector}</span>
                        <Lean breadth={s.breadth} />
                        <span className="pts-row-fig dsc-mn">{pct(s.breadth)}</span>
                        <span className="pts-row-sub dsc-mn">
                          {pct(s.buyShare)} · {s.trades.toLocaleString()}
                          {hasChange ? (
                            <span
                              className={`pts-row-ch ${
                                ch == null ? '' : ch >= 0 ? 'is-bull' : 'is-bear'
                              }`}
                            >
                              {' · '}
                              {ch == null ? 'n/a' : signed(ch)}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
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

          {/* ── confidence and context ── */}
          <div className="pts-context">
            <span className="ptk-eyebrow dsc-mn">CONFIDENCE AND CONTEXT</span>
            <ul>
              <li>
                Sample: {cur.trades.toLocaleString()} disclosed trades in {cur.year} from{' '}
                {cur.members.toLocaleString()} members; {leaning.toLocaleString()} leaned one way
                and set the reading.
              </li>
              {ytd && latestTrade ? (
                <li>
                  {cur.year} covers trades through {longDate(latestTrade)}, the newest trade date on
                  file.
                </li>
              ) : null}
              <li>
                Members may file up to 45 days after a trade, so the latest weeks fill in over
                time.
              </li>
              <li>
                Dollars are the midpoints of disclosed ranges, not exact amounts. Buys are
                purchases; sells are full and partial sales; exchanges and other types are left
                out.
              </li>
              {hasChange ? (
                <li>
                  Sector change compares members net buying in {shownYear} and {shownYear - 1},
                  only for sectors with at least 5 leaning members in both years.
                </li>
              ) : null}
              <li>A reading of what members disclosed, not investment advice or a forecast.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
