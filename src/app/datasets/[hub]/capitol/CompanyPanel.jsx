'use client';

/**
 * The Capitol Watch company card: opened from any ticker on the hub.
 *
 *   left   the stock chart (1M to 10Y), with a portrait on each purchase by
 *          a sitting member who still holds it, and recent news under it
 *   right  federal contracts over the last ten fiscal years (totals, ten
 *          year bars, agencies, largest and latest awards), then the sitting
 *          members with the largest estimated positions
 *
 * Three parallel reads (card, prices, news) through the shared prefetch
 * cache, which a hover on the ticker has usually filled; each section paints
 * when its own data lands. A dialog: Escape and the scrim close it, Tab is
 * trapped, focus returns to the opener (CwhProvider). Selecting a holder
 * closes the card and opens the member drawer. `data-ready="true"` marks the
 * moment the card part is on screen.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PriceChart } from '@/components/ezanaql/CompanyCard';
import { getJson, companyUrl } from '@/components/datasets/prefetch-cache';
import { PartyTag } from './bits';
import { DASH, count, longDate, money, monthDay, range as rangeText } from './cwh-format';

const RANGES = ['1M', '6M', '1Y', '5Y', '10Y'];

function useCompanyPart(ticker, part, rangeKey = null) {
  const [state, setState] = useState({ status: 'loading', d: null });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading', d: null });
    getJson(companyUrl(ticker, part, rangeKey))
      .then(
        ({ ok, d }) => live && setState(ok ? { status: 'ready', d } : { status: 'error', d: null }),
      )
      .catch(() => live && setState({ status: 'error', d: null }));
    return () => {
      live = false;
    };
  }, [ticker, part, rangeKey]);
  return state;
}

function Skel({ n = 4 }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="cwh-skel" />
      ))}
    </div>
  );
}

function YearBars({ years, partialFy }) {
  const max = Math.max(1, ...years.map((y) => y.total));
  return (
    <div className="cwh-co-years">
      <ol className="cwh-co-bars" aria-label="Federal contract value by fiscal year">
        {years.map((y) => {
          const partial = y.fy === partialFy;
          const label = `FY${y.fy}: ${money(y.total)}, ${count(y.awards)} awards${partial ? ' (fiscal year in progress)' : ''}`;
          return (
            <li key={y.fy} title={label}>
              <span className="cwh-sr">{label}</span>
              <span
                className={`cwh-co-bar${partial ? ' is-partial' : ''}${y.total ? '' : ' is-zero'}`}
                style={{ height: `${Math.max(2, (y.total / max) * 100)}%` }}
                aria-hidden="true"
              />
            </li>
          );
        })}
      </ol>
      <div className="cwh-co-bar-axis" aria-hidden="true">
        <span className="cwh-mono">FY{String(years[0]?.fy).slice(2)}</span>
        <span className="cwh-mono">FY{String(years[years.length - 1]?.fy).slice(2)}</span>
      </div>
    </div>
  );
}

function Contracts({ card }) {
  const c = card.contracts;
  const agencyMax = Math.max(1, ...(c.agencies || []).map((a) => a.total));
  const latest = c.latest || [];
  const latestList = latest.length ? (
    <>
      <p className="cwh-label cwh-co-gap">Latest awards, 6 months</p>
      <ul className="cwh-co-awards">
        {latest.slice(0, 5).map((a) => (
          <li key={a.id}>
            <span className="cwh-mono cwh-mute">{monthDay(a.date)}</span>
            <span className="cwh-co-agency">{a.agency || DASH}</span>
            <span className="cwh-mono cwh-strong">{money(a.amount)}</span>
          </li>
        ))}
      </ul>
    </>
  ) : null;

  if (c.preparing) {
    return (
      <>
        <p className="cwh-caption">
          The ten-year contract history is being prepared and appears after its first weekly update.
          Recent awards are shown meanwhile.
        </p>
        {latestList || <p className="cwh-caption">No federal awards in the last 6 months.</p>}
      </>
    );
  }
  if (!c.matched) {
    return (
      <>
        <p className="cwh-caption">
          No federal contracts are matched to this company in the last ten fiscal years.
        </p>
        {latestList}
      </>
    );
  }
  return (
    <>
      <dl className="cwh-co-kpis">
        <div>
          <dt className="cwh-label">10-year total</dt>
          <dd className="cwh-mono">{money(c.total)}</dd>
        </div>
        <div>
          <dt className="cwh-label">Awards</dt>
          <dd className="cwh-mono">{count(c.awards)}</dd>
        </div>
        <div>
          <dt className="cwh-label">Top agency</dt>
          <dd className="cwh-co-top" title={c.topAgency || undefined}>
            {c.topAgency || DASH}
          </dd>
        </div>
      </dl>
      <YearBars years={c.years} partialFy={c.partialFy} />
      {c.agencies?.length ? (
        <>
          <p className="cwh-label cwh-co-gap">By agency</p>
          <ul className="cwh-dr-bars cwh-dr-bars--names">
            {c.agencies.map((a) => (
              <li key={a.agency}>
                <span className="cwh-dr-bar-name">{a.agency}</span>
                <span className="cwh-port-bar" aria-hidden="true">
                  <i style={{ width: `${(a.total / agencyMax) * 100}%` }} />
                </span>
                <span className="cwh-mono">{money(a.total)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {c.top?.length ? (
        <>
          <p className="cwh-label cwh-co-gap">Largest awards</p>
          <ul className="cwh-co-awards">
            {c.top.map((a) => (
              <li key={a.id}>
                <span className="cwh-mono cwh-mute">
                  {a.date ? String(a.date).slice(0, 4) : DASH}
                </span>
                <span className="cwh-co-agency" title={a.recipient || undefined}>
                  {a.agency || DASH}
                </span>
                <span className="cwh-mono cwh-strong">{money(a.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {latestList}
    </>
  );
}

function Holders({ card, onMember }) {
  const list = card.holders || [];
  return (
    <>
      {list.length ? (
        <ol className="cwh-co-holders">
          {list.map((h, i) => (
            <li key={h.bioguideId}>
              <span className="cwh-mono cwh-faint">{i + 1}</span>
              <span className="cwh-co-holder">
                <button
                  type="button"
                  className="cwh-who-name"
                  data-member={h.bioguideId}
                  onClick={() => onMember(h.bioguideId, { name: h.name, party: h.party })}
                >
                  {h.name}
                </button>
                <span className="cwh-co-meta">
                  <PartyTag party={h.party} />{' '}
                  <span className="cwh-mono cwh-mute">
                    {h.chamber === 'senate' ? 'Sen.' : 'Rep.'} {h.state || ''}
                  </span>
                </span>
              </span>
              <span
                className="cwh-mono cwh-strong cwh-co-val"
                title={`Disclosed purchases still held: ${rangeText(h.estLow, h.estHigh)}`}
              >
                ~{money(h.estValue)}
              </span>
              <span className="cwh-mono cwh-mute cwh-co-last">
                {String(h.lastType || '').startsWith('sale') ? 'TRIM' : 'BUY'}{' '}
                {h.lastDate ? monthDay(h.lastDate) : DASH}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cwh-caption">No sitting member holds this stock, from disclosures on file.</p>
      )}
      <p className="cwh-note">
        Sitting members only
        {card.holderCount > list.length ? ` (top ${list.length} of ${card.holderCount})` : ''}.
        Holdings are inferred from STOCK Act disclosures, which report dollar ranges, never share
        counts, so members rank by estimated position value.
      </p>
    </>
  );
}

function News({ ticker }) {
  const news = useCompanyPart(ticker, 'news');
  if (news.status === 'loading') return <Skel n={3} />;
  const items = news.d?.items || [];
  if (news.status === 'error' || !items.length) {
    return <p className="cwh-caption">No headlines for this company in the last 30 days.</p>;
  }
  return (
    <ul className="cwh-co-news">
      {items.map((n) => (
        <li key={n.url}>
          <a href={n.url} target="_blank" rel="noopener noreferrer">
            {n.headline}
            <span className="cwh-sr"> (opens in a new tab)</span>
          </a>
          <span className="cwh-mono cwh-mute">
            {n.source ? `${n.source} · ` : ''}
            {n.date ? longDate(n.date) : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CompanyPanel({ ticker, name, onClose, onMember }) {
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState('1Y');
  const card = useCompanyPart(ticker, 'card');
  const prices = useCompanyPart(ticker, 'prices', range);
  const closeRef = useRef(null);
  const panelRef = useRef(null);

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

  const d = card.d;
  const chartHolders = useMemo(
    () =>
      (d?.holders || []).map((h) => ({
        bioguide_id: h.bioguideId,
        name: h.name,
        party: h.party,
        photo_url: h.photo,
      })),
    [d],
  );
  const candles = useMemo(() => prices.d?.candles || [], [prices.d]);
  /* Only purchases inside the chart's range get a portrait. */
  const purchases = useMemo(() => {
    const from = candles[0]?.date;
    return (d?.purchases || []).filter((p) => !from || p.date >= from);
  }, [d, candles]);

  if (!mounted) return null;
  const title = name || d?.company || ticker;

  return createPortal(
    <div className="cwh-tokens cwh-co-root">
      <button
        type="button"
        className="cwh-dr-scrim"
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
        data-ready={card.status === 'ready' ? 'true' : 'false'}
        ref={panelRef}
      >
        <header className="cwh-co-head">
          <div>
            <p className="cwh-label">Capitol Watch / Company</p>
            <h2 className="cwh-co-title" id="cwh-co-title">
              <span className="cwh-mono">{ticker}</span> {title !== ticker ? title : ''}
            </h2>
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

        <div className="cwh-co-grid">
          <div className="cwh-co-left">
            <div className="cwh-co-sec-head">
              <h3 className="cwh-h4">Stock price</h3>
              <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Chart range">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`cwh-pill${range === r ? ' is-active' : ''}`}
                    aria-pressed={range === r}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {prices.status === 'loading' ? (
              <Skel n={5} />
            ) : candles.length >= 2 ? (
              <PriceChart
                ticker={ticker}
                candles={candles}
                purchases={purchases}
                holders={chartHolders}
              />
            ) : (
              <p className="cwh-empty">No price history is available for {ticker} just now.</p>
            )}
            <h3 className="cwh-h4 cwh-co-gap">Recent news</h3>
            <News ticker={ticker} />
          </div>

          <div className="cwh-co-right">
            <h3 className="cwh-h4">Federal contracts, last ten fiscal years</h3>
            {card.status === 'loading' ? (
              <Skel n={6} />
            ) : card.status === 'error' || !d ? (
              <p className="cwh-empty">Company details could not be loaded just now.</p>
            ) : (
              <Contracts card={d} />
            )}
            <h3 className="cwh-h4 cwh-co-gap">Members with the largest positions</h3>
            {card.status === 'loading' ? (
              <Skel n={5} />
            ) : d ? (
              <Holders card={d} onMember={onMember} />
            ) : null}
          </div>
        </div>
        <p className="cwh-note cwh-co-src">
          Sources: USAspending.gov (federal contracts), House Clerk and Senate eFD (holdings), daily
          closes from market data providers, company news from financial news providers.
        </p>
      </section>
    </div>,
    document.body,
  );
}
