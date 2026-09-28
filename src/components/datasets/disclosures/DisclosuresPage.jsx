'use client';

/**
 * Financial disclosures, House and Senate. ONE implementation, two chambers,
 * mounted by PoliticianTracker behind a House | Senate switch (passed in as
 * `headerAside`).
 *
 * Built to docs/design/house-handoff/ (04-SPEC.md for the measurements,
 * 02-INTERACTIONS.json for behaviour, 03-TOKENS.css for the palette,
 * 05-ACCEPTANCE.md for done). Everything chamber-specific arrives as a config
 * from chamber-config.js; this file never branches on the chamber name, so a
 * difference that cannot be expressed as a config value is a design question,
 * not a code one.
 *
 * The shared green chrome is NOT drawn here. It is mounted by the datasets
 * layout, and this page's only contribution to it is the ticker items it
 * publishes through usePublishTicker. Nothing in disclosures.css targets it.
 *
 * Stage 2 scope: the static page on the fixture. The member panel (stage 3)
 * and live data (stage 4) land next; the tabs other than Trades are present
 * as real controls but their views are not built yet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import MemberProfile from './MemberProfile';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import {
  BRACKETS,
  FIXTURE_BY_MONTH,
  FIXTURE_LEADERBOARD,
  FIXTURE_METRICS,
  FIXTURE_TICKER_ITEMS,
  FIXTURE_TRADES,
} from './fixture';
import './disclosures.css';

const TABS = [
  { id: 'trades', label: 'Trades' },
  { id: 'filings', label: 'Filings' },
  { id: 'members', label: 'Members' },
  { id: 'tickers', label: 'Tickers' },
  { id: 'coverage', label: 'Coverage', marker: true },
];

const TX_SEGMENTS = ['ALL', 'BUY', 'SELL', 'EXCH'];
const LAG_SEGMENTS = ['ANY', '≤45D', '>45D'];

/* The law allows 45 days from transaction to filing. Over that is marked, not
   editorialised: the number is the finding. */
const LAG_LIMIT = 45;

const TYPE_CHIP = {
  P: { label: 'BUY', cls: 'dsc-chip--buy' },
  S: { label: 'SELL', cls: 'dsc-chip--sell' },
  E: { label: 'EXCH', cls: 'dsc-chip--exch' },
};

/** A middle dot, never a dash and never a zero, for anything unknown. */
const NONE = '·';

function Metric({ label, figure, caption, positive }) {
  return (
    <div className="dsc-metric">
      <span className="dsc-label">{label}</span>
      <p className={`dsc-metric-fig${positive ? ' dsc-metric-fig--pos' : ''}`}>{figure}</p>
      <p className="dsc-metric-cap">{caption}</p>
    </div>
  );
}

/** A slug that survives a round trip through the URL and back to a name. */
export function memberSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[[\]]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Build one member's profile out of the rows already on the page. */
export function memberFromTrades(name, trades, config) {
  const mine = trades.filter((t) => t.member === name);
  const first = mine[0] || {};
  const counts = new Map();
  for (const t of mine) {
    if (!t.ticker) continue;
    counts.set(t.ticker, (counts.get(t.ticker) || 0) + 1);
  }
  const lags = mine
    .map((t) => t.lag)
    .filter((n) => typeof n === 'number')
    .sort((a, b) => a - b);
  return {
    slug: memberSlug(name),
    name,
    party: first.party,
    state: first.state,
    district: config.hasDistrict ? first.district : null,
    filings: mine.length,
    ptrs: mine.length,
    txns: mine.length,
    medianLag: lags.length ? lags[Math.floor(lags.length / 2)] : null,
    topTickers: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([ticker, count]) => ({ ticker, count })),
    trades: mine,
    rows: mine.map((t) => ({
      id: t.id,
      ticker: t.ticker,
      type: t.type,
      bracket: t.bracket,
      filed: t.filed,
      url: t.url || null,
      pending: Boolean(t.pending),
    })),
  };
}

/* `sample` defaults to FALSE on purpose: omitting it must mean live. A
   truthy default made a page that had been flipped to live keep rendering
   placeholder names under no chip, which is the exact failure the chip
   exists to prevent. Sample is now something a page asks for. */
export default function DisclosuresPage({ config, sample = false, headerAside = null }) {
  const [tab, setTab] = useState('trades');
  const [openMember, setOpenMember] = useState(null);
  const triggerRef = useRef(null);
  const pushedRef = useRef(false);
  const [tx, setTx] = useState('ALL');
  const [lag, setLag] = useState('ANY');
  const [year, setYear] = useState('2026');
  const [brackets, setBrackets] = useState(() => new Set(BRACKETS));
  const [member, setMember] = useState('');
  const [ticker, setTicker] = useState('');

  /* Sample renders the fixture; live fetches. There is deliberately no third
     path: a live page that cannot reach its data shows an empty or pending
     state, never the fixture, because fixture rows carry placeholder names
     and would read as real filings on a page with no SAMPLE chip. */
  const [live, setLive] = useState({ summary: null, trades: [], loaded: false });

  useEffect(() => {
    if (sample) return undefined;
    let alive = true;
    const base = `/api/disclosures/${config.chamber}`;
    const qs = new URLSearchParams({ year: String(year), sort: 'filed', limit: '50' });
    if (tx !== 'ALL') qs.set('type', tx.toLowerCase());
    if (ticker) qs.set('ticker', ticker);
    if (member) qs.set('member', member);
    if (lag !== 'ANY') qs.set('lag', lag === '≤45D' ? 'le45' : 'gt45');
    Promise.all([
      fetch(`${base}/summary?year=${year}`).then((r) => r.json()),
      fetch(`${base}/trades?${qs}`).then((r) => r.json()),
    ])
      .then(([summary, t]) => {
        if (!alive) return;
        setLive({ summary, trades: t?.rows || [], loaded: true, total: t?.total ?? 0 });
      })
      .catch(() => alive && setLive({ summary: null, trades: [], loaded: true, total: 0 }));
    return () => {
      alive = false;
    };
  }, [sample, config.chamber, year, tx, ticker, member, lag]);

  const trades = sample
    ? FIXTURE_TRADES
    : live.trades.map((t) => ({
        id: t.id,
        member: t.member,
        party: null,
        state: t.where,
        district: null,
        ticker: t.ticker,
        asset: t.asset,
        type: t.type,
        traded: t.traded,
        filed: t.filed,
        lag: t.lag,
        bracket: t.bracket,
        url: t.docId
          ? `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${t.docId}.pdf`
          : null,
      }));

  /* The real number of PTRs whose trades have not been extracted. This is
     what the pending state reports, so it is never a guess and never zero
     standing in for "unknown". */
  const pendingPtrs = sample ? 0 : (live.summary?.ptrsPending ?? 0);

  const tickerItems = useMemo(
    () =>
      FIXTURE_TICKER_ITEMS.map((t) => ({
        id: t.id,
        lead: t.lead,
        main: t.main,
        value: t.value,
      })),
    [],
  );
  usePublishTicker({
    items: tickerItems,
    ariaLabel: `Recent ${config.chamber} disclosures`,
  });

  const years = useMemo(() => {
    const out = [];
    for (let y = 2026; y >= config.coverage.firstYear; y -= 1) out.push(String(y));
    return out;
  }, [config.coverage.firstYear]);

  const toggleBracket = (b) =>
    setBrackets((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });

  const clearAll = () => {
    setTx('ALL');
    setLag('ANY');
    setYear('2026');
    setBrackets(new Set(BRACKETS));
    setMember('');
    setTicker('');
  };

  /* Seeded from the rail, re-seeding on every filter change until the visitor
     edits it by hand. Stage 2 shows the seed; the editor lands with the live
     builder. */
  /* Built against the chamber's QUERYABLE dataset, which for the House is the
     filing index: house.trades is bound but its table is empty, so a seed
     against it would open the bar on a query that can only refuse. The
     filters that map onto filings scope it; the rest scope the page. A
     chamber with nothing live falls back to the shared cross-dataset seed. */
  const seededQuery = useMemo(() => {
    const ds = config.builderDataset;
    if (!ds) return seedForDataset(null);
    const where = [`filing_year = ${year}`];
    if (member) where.push(`member_last = "${member}"`);
    return `FROM ${ds}
WHERE ${where.join(' AND ')}
SELECT member_last, filing_type, filing_year, filing_date
ORDER BY filing_date DESC
LIMIT 20;`;
  }, [config.builderDataset, year, member]);

  /* The panel hangs below the green chrome, which in this repo SCROLLS AWAY
     rather than sticking. The handoff's fixed 76px assumes a persistent
     chrome, so the offset is measured at open instead: whatever is left of
     the chrome below the viewport top, and zero once it has gone. */
  const measureTop = useCallback(() => {
    if (typeof document === 'undefined') return;
    const chrome = document.querySelector('.dscat-chrome');
    const bottom = chrome ? Math.max(0, chrome.getBoundingClientRect().bottom) : 0;
    document.documentElement.style.setProperty('--dsc-panel-top', `${Math.round(bottom)}px`);
  }, []);

  const openMemberPanel = useCallback(
    (name, el) => {
      triggerRef.current = el || null;
      const m = memberFromTrades(name, trades, config);
      measureTop();
      setOpenMember(m);
      /* Its own URL, so it is shareable and the back button closes it. */
      if (typeof window !== 'undefined') {
        window.history.pushState({ dscMember: m.slug }, '', `${config.routes.member}/${m.slug}`);
        pushedRef.current = true;
      }
    },
    [trades, config, measureTop],
  );

  const closeMemberPanel = useCallback(({ fromPop = false } = {}) => {
    setOpenMember(null);
    if (!fromPop && pushedRef.current && typeof window !== 'undefined') {
      window.history.back();
    }
    pushedRef.current = false;
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => {
      pushedRef.current = false;
      setOpenMember(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!openMember) return undefined;
    window.addEventListener('scroll', measureTop, true);
    window.addEventListener('resize', measureTop);
    return () => {
      window.removeEventListener('scroll', measureTop, true);
      window.removeEventListener('resize', measureTop);
    };
  }, [openMember, measureTop]);

  /* Figures come from the source or they do not appear. A middle dot is the
     answer for a count we have not loaded, never a zero, which would read as
     "the source published none". */
  const NO_FIGURE = '·';
  const metrics = useMemo(() => {
    if (sample) return FIXTURE_METRICS;
    const s2 = live.summary;
    const n = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : NO_FIGURE);
    return {
      filings: s2 ? n(s2.filings) : NO_FIGURE,
      filingsCaption: s2?.years
        ? `${config.coverage.firstYear} to ${year}, ${s2.years} index ${s2.years === 1 ? 'year' : 'years'}`
        : 'index years loading',
      ptrs: s2 ? n(s2.ptrs) : NO_FIGURE,
      ptrsCaption: 'periodic transaction reports to date',
      txns: s2 ? n(s2.trades) : NO_FIGURE,
      txnsCaption: s2?.trades
        ? 'extracted from filing documents'
        : `${n(s2?.ptrsPending)} reports awaiting extraction`,
      recent: s2?.mostRecent || NO_FIGURE,
      recentCaption: 'PTRs post within days, annuals in mid June',
    };
  }, [sample, live.summary, config.coverage.firstYear, year]);

  const district = (t) =>
    config.hasDistrict ? `${t.party}-${t.state}-${t.district}` : `${t.party}-${t.state}`;

  return (
    <div className="dsc">
      <header className="dsc-head">
        <p className="dsc-eyebrow">
          {config.eyebrow}
          {sample ? <span className="dsc-sample">SAMPLE DATA</span> : null}
        </p>
        <h1 className="dsc-title">{config.title}</h1>
        {headerAside}
      </header>

      {/* The one shared query bar, same size and placement on every dataset
          page. It was a picture of a builder here: no state, no handlers. */}
      <EzanaQLBar datasetScope={config.builderDataset} seedQuery={seededQuery} />

      <div className="dsc-body">
        <aside className="dsc-rail" aria-label="Filters">
          <div className="dsc-rail-head">
            <span className="dsc-label">Filters</span>
            <button type="button" className="dsc-clear" onClick={clearAll}>
              Clear
            </button>
          </div>

          <div className="dsc-field">
            <label className="dsc-label" htmlFor="dsc-member">
              Member
            </label>
            <input
              id="dsc-member"
              className="dsc-input"
              placeholder="Member name"
              value={member}
              onChange={(e) => setMember(e.target.value)}
            />
          </div>

          <div className="dsc-field">
            <label className="dsc-label" htmlFor="dsc-ticker">
              Ticker
            </label>
            <input
              id="dsc-ticker"
              className="dsc-input dsc-input--mono"
              placeholder="Ticker, e.g. NVDA"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
          </div>

          <div className="dsc-field">
            <label className="dsc-label" htmlFor="dsc-year">
              Year
            </label>
            <select
              id="dsc-year"
              className="dsc-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="dsc-field">
            <span className="dsc-label">Transaction</span>
            <div className="dsc-seg" role="group" aria-label="Transaction type">
              {TX_SEGMENTS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`dsc-seg-btn${tx === s ? ' is-on' : ''}`}
                  aria-pressed={tx === s}
                  onClick={() => setTx(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="dsc-field">
            <span className="dsc-label">Amount bracket</span>
            <div className="dsc-checks">
              {BRACKETS.map((b) => (
                <label className="dsc-check" key={b}>
                  <input
                    type="checkbox"
                    checked={brackets.has(b)}
                    onChange={() => toggleBracket(b)}
                  />
                  {b}
                </label>
              ))}
            </div>
            <p className="dsc-note">
              Amounts are the ranges members disclose. Nothing on this page shows an exact figure.
            </p>
          </div>

          <div className="dsc-field">
            <span className="dsc-label">Disclosure lag</span>
            <div className="dsc-seg" role="group" aria-label="Disclosure lag">
              {LAG_SEGMENTS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`dsc-seg-btn${lag === s ? ' is-on' : ''}`}
                  aria-pressed={lag === s}
                  onClick={() => setLag(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="dsc-main">
          <div className="dsc-metrics">
            <Metric label="Filings" figure={metrics.filings} caption={metrics.filingsCaption} />
            <Metric label={`PTRs in ${year}`} figure={metrics.ptrs} caption={metrics.ptrsCaption} />
            <Metric
              label="Transactions extracted"
              figure={metrics.txns}
              caption={metrics.txnsCaption}
            />
            <Metric
              label="Most recent filing"
              figure={metrics.recent}
              caption={metrics.recentCaption}
              positive
            />
          </div>

          <div className="dsc-tabs" role="tablist" aria-label="Disclosure views">
            {TABS.map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                id={`dsc-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="dsc-panel"
                className="dsc-tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.marker ? <span className="dsc-tab-dot" aria-hidden="true" /> : null}
              </button>
            ))}
            <span className="dsc-sort">Sorted by filed, newest first</span>
          </div>

          <div id="dsc-panel" role="tabpanel" aria-labelledby={`dsc-tab-${tab}`}>
            {tab === 'trades' ? (
              <div className="dsc-main">
                <div className="dsc-charts">
                  <section>
                    <div className="dsc-block-head">
                      <span className="dsc-label">Transactions by month, {year}</span>
                      <span className="dsc-legend">
                        <span>
                          <i className="dsc-swatch dsc-swatch--buy" aria-hidden="true" />
                          Buys
                        </span>
                        <span>
                          <i className="dsc-swatch dsc-swatch--sell" aria-hidden="true" />
                          Sells
                        </span>
                      </span>
                      <span className="dsc-block-cap">counts, not dollars</span>
                    </div>
                    <div
                      style={{ height: 128 }}
                      role="img"
                      aria-label={`Transactions by month for ${year}, buys against sells, in counts`}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={FIXTURE_BY_MONTH} barGap={2} margin={{ top: 4 }}>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray={CHART.gridDash}
                            stroke={CHART.gridStroke}
                          />
                          <XAxis
                            dataKey="month"
                            tick={CHART.tick}
                            axisLine={CHART.xAxisLine}
                            tickLine={false}
                          />
                          <YAxis hide />
                          {/* Emerald for buys, ink at 55% for sells. Sell is not
                              red: it is not the bad outcome. */}
                          <Bar dataKey="buys" fill="var(--emerald)" radius={[4, 4, 0, 0]} />
                          <Bar
                            dataKey="sells"
                            fill="rgba(10, 14, 19, 0.55)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="dsc-lead">
                    <div className="dsc-block-head">
                      <span className="dsc-label">Most traded, last 30 days</span>
                    </div>
                    {FIXTURE_LEADERBOARD.map((r) => {
                      const total = r.buys + r.sells;
                      return (
                        <button type="button" className="dsc-lead-row" key={r.ticker}>
                          <span className="dsc-lead-tk">{r.ticker}</span>
                          <span className="dsc-split" aria-hidden="true">
                            <i
                              className="dsc-split-buy"
                              style={{ width: `${(r.buys / total) * 100}%` }}
                            />
                            <i
                              className="dsc-split-sell"
                              style={{ width: `${(r.sells / total) * 100}%` }}
                            />
                          </span>
                          <span className="dsc-lead-n">{total}</span>
                        </button>
                      );
                    })}
                  </section>
                </div>

                <section>
                  {!sample && live.loaded && !trades.length && pendingPtrs > 0 ? (
                    /* Live on filings, but the trades inside them have not
                       been extracted yet. Worded with the real count, never an
                       empty table and never the fixture. */
                    <p className="dsc-pending dsc-pending--block">
                      <i className="bi bi-hourglass-split" aria-hidden="true" />
                      {pendingPtrs.toLocaleString('en-US')} periodic transaction reports are
                      awaiting extraction. Filings are live; their transactions appear here as each
                      document is parsed.
                    </p>
                  ) : null}
                  <table className="dsc-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Ticker</th>
                        <th>Asset</th>
                        <th>Type</th>
                        <th>Traded</th>
                        <th>Filed</th>
                        <th className="dsc-th--n">Lag</th>
                        <th className="dsc-th--n">Amount disclosed</th>
                        <th aria-label="Source" />
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t) => {
                        const chip = TYPE_CHIP[t.type];
                        const late = t.lag > LAG_LIMIT;
                        return (
                          <tr
                            key={t.id}
                            className={
                              openMember?.name === t.member ? 'dsc-row-selected' : undefined
                            }
                          >
                            <td>
                              <button
                                type="button"
                                className="dsc-member"
                                onClick={(e) => openMemberPanel(t.member, e.currentTarget)}
                              >
                                {t.member}
                              </button>
                              <span className="dsc-dist">{district(t)}</span>
                            </td>
                            <td>
                              {t.ticker ? (
                                <button type="button" className="dsc-tk">
                                  {t.ticker}
                                </button>
                              ) : (
                                <span className="dsc-none" aria-label="No ticker">
                                  {NONE}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="dsc-asset" title={t.asset}>
                                {t.asset}
                              </span>
                            </td>
                            <td>
                              <span className={`dsc-chip ${chip.cls}`}>{chip.label}</span>
                            </td>
                            <td>
                              <span className="dsc-date">{t.traded}</span>
                            </td>
                            <td>
                              <span className="dsc-date">{t.filed}</span>
                            </td>
                            <td className="dsc-td--n">
                              <span className={`dsc-lag${late ? ' dsc-lag--late' : ''}`}>
                                {t.lag}d
                              </span>
                            </td>
                            <td className="dsc-td--n">
                              <span className="dsc-bracket">{t.bracket}</span>
                            </td>
                            <td>
                              {t.url ? (
                                <a
                                  className="dsc-src"
                                  href={t.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={config.source.docLabel}
                                >
                                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                                </a>
                              ) : (
                                <span className="dsc-none" aria-hidden="true">
                                  ·
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="dsc-tfoot">
                    <p>{config.lagNote}</p>
                    <span className="dsc-page">
                      1 to {trades.length} of {trades.length}
                    </span>
                  </div>
                </section>
              </div>
            ) : (
              <p className="dsc-note">This view lands in a later stage.</p>
            )}
          </div>

          <p className="dsc-compliance">{config.compliance}</p>
        </main>
      </div>

      {/* One panel, never two. Clicking another member swaps its contents. */}
      {openMember ? (
        <>
          <button
            type="button"
            className="dsc-scrim"
            aria-label="Close member panel"
            onClick={() => closeMemberPanel()}
          />
          <MemberProfile
            member={openMember}
            config={config}
            mode="panel"
            onClose={() => closeMemberPanel()}
            onTicker={() => {}}
          />
        </>
      ) : null}
    </div>
  );
}
