'use client';

/**
 * Capitol Watch company card: opens from any ticker on the hub (Congress's
 * portfolio, the Venn, the signals tables).
 *
 *   left   the stock chart (1M to 10Y), with a portrait on each purchase by a
 *          member who still holds the stock; recent news below it
 *   right  federal contracts over the last ten fiscal years (bars by year,
 *          agency split, largest awards, latest awards); then the members
 *          with the largest estimated positions
 *
 * Three requests (card, prices, news) start together and each section paints
 * when its own data lands; a pointer over a ticker prefetches the card and
 * the 1Y prices (CwhProvider). A dialog: Escape and the scrim close it, focus
 * returns to the opener, Tab stays inside.
 *
 * STOCK Act disclosures report dollar ranges per trade, never share counts,
 * so positions are ranked by estimated dollar value and the card says so.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MemberAvatar from '@/components/datasets/politician-tracker/MemberAvatar';
import { PriceChart } from '@/components/ezanaql/CompanyCard';
import { getJson } from '@/components/datasets/prefetch-cache';
import { PartyTag } from './bits';
import { DASH, count, longDate, money, monthDay, pct0, range, signed } from './cwh-format';

const RANGES = ['1M', '6M', '1Y', '5Y', '10Y'];

export const companyUrl = (ticker, part = 'card', r = '1Y') =>
  `/api/datasets/capitol/company?ticker=${encodeURIComponent(ticker)}&part=${part}${
    part === 'prices' ? `&range=${r}` : ''
  }`;

function useJson(url) {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    if (!url) return undefined;
    let live = true;
    setState((s) => (s.data ? { ...s, status: 'refresh' } : { status: 'loading' }));
    getJson(url)
      .then(
        ({ ok, d }) => live && setState(ok ? { status: 'ready', data: d } : { status: 'error' }),
      )
      .catch(() => live && setState({ status: 'error' }));
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

function ago(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const h = Math.round((Date.now() - t) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 14 ? `${d}d ago` : monthDay(iso);
}

const Skel = ({ n = 4, tall = false }) => (
  <div aria-busy="true">
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className={`cwh-skel${tall ? ' cwh-skel--chart' : ''}`} />
    ))}
  </div>
);

/* ── contracts ─────────────────────────────────────────────────────── */

function YearBars({ years }) {
  const max = years.reduce((m, y) => Math.max(m, y.total), 0);
  const [active, setActive] = useState(null);
  const shown = active != null ? years[active] : null;
  return (
    <div className="cwh-co-bars-wrap">
      <div
        className="cwh-co-bars"
        role="list"
        aria-label="Federal contract obligations by fiscal year"
        onMouseLeave={() => setActive(null)}
      >
        {years.map((y, i) => (
          <div
            key={y.fy}
            role="listitem"
            className={`cwh-co-bar${active === i ? ' is-active' : ''}`}
            tabIndex={0}
            aria-label={`FY${y.fy}: ${money(y.total)}, ${count(y.n)} awards`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span className="cwh-co-bar-track">
              <i style={{ height: `${max ? Math.max(2, (y.total / max) * 100) : 0}%` }} />
            </span>
            <span className="cwh-co-bar-fy">{String(y.fy).slice(2)}</span>
          </div>
        ))}
      </div>
      <p className="cwh-co-bar-read" aria-live="polite">
        {shown ? (
          <>
            <b>FY{shown.fy}</b> {money(shown.total)} · {count(shown.n)} awards
          </>
        ) : (
          <span className="cwh-faint">Hover a year for its total</span>
        )}
      </p>
    </div>
  );
}

function Contracts({ c }) {
  if (!c.historyReady && !c.recent.length) {
    return (
      <p className="cwh-empty">
        No federal contracts matched to this company. Contracts are matched to listed companies by
        recipient name.
      </p>
    );
  }
  return (
    <>
      {c.historyReady && c.fyFrom ? (
        <>
          <div className="cwh-co-kpis">
            <div>
              <span className="cwh-label">
                FY{c.fyFrom} to FY{c.fyTo}
              </span>
              <b className="cwh-mono">{money(c.total)}</b>
            </div>
            <div>
              <span className="cwh-label">Awards</span>
              <b className="cwh-mono">{count(c.count)}</b>
            </div>
            <div>
              <span className="cwh-label">Top agency</span>
              <b className="cwh-co-kpi-text">{c.agencies[0]?.agency || DASH}</b>
            </div>
          </div>
          {c.total > 0 ? (
            <YearBars years={c.years} />
          ) : (
            <p className="cwh-caption">No prime awards matched in these ten fiscal years.</p>
          )}
          {c.agencies.length ? (
            <ul className="cwh-co-agencies" aria-label="Awarding agencies">
              {c.agencies.map((a) => (
                <li key={a.agency}>
                  <span className="cwh-co-agency-name" title={a.agency}>
                    {a.agency}
                  </span>
                  <span className="cwh-port-bar" aria-hidden="true">
                    <i style={{ width: `${a.share * 100}%` }} />
                  </span>
                  <span className="cwh-mono">{pct0(a.share * 100)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {c.top.length ? (
            <>
              <p className="cwh-label cwh-co-sub">Largest awards</p>
              <table className="cwh-table cwh-co-table">
                <thead>
                  <tr>
                    <th scope="col">AGENCY</th>
                    <th scope="col">DATE</th>
                    <th scope="col" className="is-num">
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.top.slice(0, 5).map((a) => (
                    <tr key={a.id}>
                      <td
                        className="cwh-co-ellipsis"
                        title={`${a.agency || ''} · ${a.recipient || ''}`}
                      >
                        {a.agency || DASH}
                      </td>
                      <td className="cwh-mono cwh-mute">{longDate(a.date)}</td>
                      <td className="cwh-mono is-num cwh-strong">{money(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </>
      ) : (
        <p className="cwh-caption">The ten-year history is being prepared; latest awards below.</p>
      )}
      {c.recent.length ? (
        <>
          <p className="cwh-label cwh-co-sub">Latest awards, 6 months</p>
          <ul className="cwh-co-recent">
            {c.recent.slice(0, 5).map((a) => (
              <li key={a.id}>
                <span className="cwh-mono cwh-mute">{monthDay(a.date)}</span>
                <span className="cwh-co-ellipsis" title={a.agency}>
                  {a.agency || DASH}
                </span>
                <span className="cwh-mono cwh-strong">{money(a.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/* ── holders ───────────────────────────────────────────────────────── */

function Holders({ h, onMember }) {
  if (!h.count) {
    return <p className="cwh-empty">No member&apos;s disclosures show an open position.</p>;
  }
  const max = h.rows.reduce((m, r) => Math.max(m, r.est_value || 0), 0);
  return (
    <>
      <p className="cwh-co-holders-sum">
        <b className="cwh-mono">{count(h.count)}</b> members hold it · est.{' '}
        <b className="cwh-mono">{money(h.totalEst)}</b> between them
      </p>
      <ol className="cwh-co-holders">
        {h.rows.slice(0, 8).map((r, i) => (
          <li key={r.bioguide_id}>
            <span className="cwh-mono cwh-faint cwh-co-rank">{i + 1}</span>
            <MemberAvatar
              name={r.name}
              bioguideId={r.bioguide_id}
              chamber={r.chamber}
              photoUrl={r.photo_url}
              size={32}
            />
            <span className="cwh-co-holder-main">
              <button
                type="button"
                className="cwh-who-name"
                data-member={r.bioguide_id}
                onClick={() => onMember(r)}
              >
                {r.name}
              </button>
              <span className="cwh-co-holder-meta">
                <PartyTag party={r.party} /> {r.chamber === 'senate' ? 'Senate' : 'House'}
                {r.state ? ` · ${r.state}` : ''} · last{' '}
                {r.last_action === 'sale_partial' ? 'partial sale' : 'buy'} {monthDay(r.last_trade)}
              </span>
            </span>
            <span className="cwh-co-holder-val">
              <span className="cwh-port-bar" aria-hidden="true">
                <i style={{ width: `${max ? ((r.est_value || 0) / max) * 100 : 0}%` }} />
              </span>
              <span
                className="cwh-mono cwh-strong"
                title={
                  r.est_high > 0
                    ? `Purchases since the last full sale: ${range(r.est_low, r.est_high)}`
                    : undefined
                }
              >
                ~{money(r.est_value)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {h.count > 8 ? <p className="cwh-caption">and {h.count - 8} more members</p> : null}
      <p className="cwh-note">
        Sitting members only. Disclosures report dollar ranges, not share counts, so members are
        ranked by the estimated value of their open position: the midpoints of their disclosed buys
        since their last full sale, less partial sales. Inferred, not reported.
      </p>
    </>
  );
}

/* ── the card ──────────────────────────────────────────────────────── */

export default function CompanyPanel({ ticker, name: givenName, onClose, onMember }) {
  const [rng, setRng] = useState('1Y');
  const card = useJson(companyUrl(ticker, 'card'));
  const prices = useJson(companyUrl(ticker, 'prices', rng));
  const news = useJson(companyUrl(ticker, 'news'));
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  const d = card.data;
  const p = prices.data;
  const holdersById = useMemo(() => d?.holders?.rows || [], [d]);
  if (!mounted) return null;

  const title = givenName || d?.name || ticker;

  return createPortal(
    <div className="cwh-tokens cwh-co-root">
      <button
        type="button"
        className="cwh-co-scrim"
        aria-label="Close company"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        className="cwh-co"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cwh-co-title"
        aria-busy={card.status === 'loading'}
        data-ready={card.status === 'ready' ? 'true' : undefined}
        ref={panelRef}
      >
        <header className="cwh-co-head">
          <div className="cwh-co-id">
            <span className="cwh-co-ticker cwh-mono">{ticker}</span>
            <div>
              <h2 className="cwh-co-title" id="cwh-co-title">
                {title}
              </h2>
              <p className="cwh-co-subtitle">
                {d?.sector ? <span className="cwh-chip">{d.sector.toUpperCase()}</span> : null}
                {p ? (
                  <span className="cwh-co-quote">
                    <b className="cwh-mono">${p.last.toFixed(2)}</b>
                    <span
                      className={`cwh-mono ${p.changePct == null ? '' : p.changePct >= 0 ? 'is-pos' : 'is-neg'}`}
                    >
                      {signed(p.changePct)} {rng}
                    </span>
                    <span className="cwh-faint cwh-mono">close {monthDay(p.lastDate)}</span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cwh-round"
            onClick={onClose}
            ref={closeRef}
            aria-label="Close company"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className="cwh-co-body">
          <div className="cwh-co-left">
            <section className="cwh-co-section" aria-labelledby="cwh-co-chart-h">
              <div className="cwh-co-section-head">
                <h3 className="cwh-h4" id="cwh-co-chart-h">
                  Stock price
                </h3>
                <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Chart range">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`cwh-pill${rng === r ? ' is-active' : ''}`}
                      aria-pressed={rng === r}
                      onClick={() => setRng(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {prices.status === 'loading' ? (
                <Skel n={1} tall />
              ) : prices.status === 'error' || !p?.candles?.length ? (
                <p className="cwh-empty">Price history is not available for {ticker} right now.</p>
              ) : (
                <div className={prices.status === 'refresh' ? 'is-busy' : undefined}>
                  <PriceChart
                    ticker={ticker}
                    candles={p.candles}
                    purchases={(d?.purchases || []).filter((x) => x.date >= p.candles[0].date)}
                    holders={holdersById}
                  />
                </div>
              )}
            </section>

            <section className="cwh-co-section" aria-labelledby="cwh-co-news-h">
              <div className="cwh-co-section-head">
                <h3 className="cwh-h4" id="cwh-co-news-h">
                  Recent news
                </h3>
                <span className="cwh-caption">Last 30 days</span>
              </div>
              {news.status === 'loading' ? (
                <Skel n={4} />
              ) : news.status === 'error' || !news.data?.items?.length ? (
                <p className="cwh-empty">No recent headlines for {ticker}.</p>
              ) : (
                <ul className="cwh-co-news">
                  {news.data.items.map((a) => (
                    <li key={a.url}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        <span className="cwh-co-news-meta">
                          {a.source ? <b>{a.source}</b> : null}
                          <span className="cwh-mono">{ago(a.date)}</span>
                        </span>
                        <span className="cwh-co-news-h">
                          {a.headline} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                        </span>
                        {a.summary ? <span className="cwh-co-news-s">{a.summary}</span> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="cwh-co-right">
            <section className="cwh-co-section" aria-labelledby="cwh-co-contracts-h">
              <div className="cwh-co-section-head">
                <h3 className="cwh-h4" id="cwh-co-contracts-h">
                  Government contracts, 10 years
                </h3>
              </div>
              {card.status === 'loading' ? (
                <Skel n={5} />
              ) : card.status === 'error' ? (
                <p className="cwh-empty">Contracts could not be loaded just now.</p>
              ) : (
                <Contracts c={d.contracts} />
              )}
            </section>

            <section className="cwh-co-section" aria-labelledby="cwh-co-holders-h">
              <div className="cwh-co-section-head">
                <h3 className="cwh-h4" id="cwh-co-holders-h">
                  Members with the largest positions
                </h3>
              </div>
              {card.status === 'loading' ? (
                <Skel n={5} />
              ) : card.status === 'error' ? (
                <p className="cwh-empty">Holders could not be loaded just now.</p>
              ) : (
                <Holders h={d.holders} onMember={onMember} />
              )}
            </section>
          </div>
        </div>
        <p className="cwh-note cwh-co-src">
          Sources: USAspending.gov (prime awards, federal fiscal years), House Clerk and Senate eFD
          (STOCK Act), daily closing prices, company news. Nothing here is investment advice.
        </p>
      </section>
    </div>,
    document.body,
  );
}
