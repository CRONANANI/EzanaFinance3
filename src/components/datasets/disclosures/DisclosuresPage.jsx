'use client';

/**
 * Financial disclosures, House and Senate. ONE implementation, two chambers.
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
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
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

export default function DisclosuresPage({ config, sample = true }) {
  const [tab, setTab] = useState('trades');
  const [tx, setTx] = useState('ALL');
  const [lag, setLag] = useState('ANY');
  const [year, setYear] = useState('2026');
  const [brackets, setBrackets] = useState(() => new Set(BRACKETS));
  const [member, setMember] = useState('');
  const [ticker, setTicker] = useState('');

  /* Stage 2 renders the fixture. Stage 4 swaps this for the API and the
     filters below start scoping it; they are wired to state now so the shape
     of that change is a data swap, not a rewrite. */
  const trades = FIXTURE_TRADES;

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
  const seededQuery = useMemo(() => {
    const where = [`filed_on >= ${year}-01-01`];
    if (tx !== 'ALL') where.push(`tx_type = '${tx}'`);
    if (ticker) where.push(`ticker = '${ticker.toUpperCase()}'`);
    if (member) where.push(`member_last ~ '${member}'`);
    if (lag !== 'ANY') where.push(lag === '≤45D' ? 'lag_days <= 45' : 'lag_days > 45');
    return `FROM ${config.builderDataset} WHERE ${where.join(' AND ')} ORDER BY filed_on DESC`;
  }, [config.builderDataset, year, tx, ticker, member, lag]);

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
      </header>

      {/* The builder is one light row and never the focal point of the page. */}
      <div className="dsc-builder-wrap">
        <div className="dsc-builder">
          <span className="dsc-builder-mark">
            <i className="bi bi-stars" aria-hidden="true" />
            Ezana AI
          </span>
          <span className="dsc-builder-div" aria-hidden="true" />
          <input
            className="dsc-builder-input"
            placeholder="Describe a report in plain English"
            aria-label="Describe a report in plain English"
          />
          <button type="button" className="dsc-builder-go">
            Generate EzanaQL
          </button>
        </div>
        <div className="dsc-query">
          <code className="dsc-query-text">{seededQuery}</code>
          <span className="dsc-query-links">
            {['Edit', 'Run', 'CSV', 'JSON'].map((l) => (
              <button type="button" key={l} className="dsc-query-link">
                {l}
              </button>
            ))}
          </span>
        </div>
      </div>

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
            <Metric
              label="Filings"
              figure={FIXTURE_METRICS.filings}
              caption={FIXTURE_METRICS.filingsCaption}
            />
            <Metric
              label={`PTRs in ${year}`}
              figure={FIXTURE_METRICS.ptrs}
              caption={FIXTURE_METRICS.ptrsCaption}
            />
            <Metric
              label="Transactions extracted"
              figure={FIXTURE_METRICS.txns}
              caption={FIXTURE_METRICS.txnsCaption}
            />
            <Metric
              label="Most recent filing"
              figure={FIXTURE_METRICS.recent}
              caption={FIXTURE_METRICS.recentCaption}
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
                          <tr key={t.id}>
                            <td>
                              <button type="button" className="dsc-member">
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
                              <span className="dsc-src" aria-hidden="true">
                                <i className="bi bi-box-arrow-up-right" />
                              </span>
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
    </div>
  );
}
