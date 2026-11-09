'use client';

/**
 * [E] Company hero for the Company view (Nov 2026 redesign): identity row,
 * actions, the price block with its key/value list, and the 1Y price chart.
 * Reads only the useCompanyResearch snapshot, so the price here is the same
 * price the DCF, findings and peer row use.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { fmtMoney, fmtSignedMoney, fmtSignedPct, signOf } from '@/lib/research/company-research';

/* Recharts stays out of the first load; same height as the chart, so no shift. */
const StockPriceChart = dynamic(() => import('@/components/research/StockPriceChart'), {
  ssr: false,
  loading: () => <div className="rc-skel rc-skel--chart" aria-hidden="true" />,
});

const ET = 'America/New_York';
const asOfFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: ET,
});

/** "Jan 27, 2025, 4:00 PM ET" from unix seconds. */
function formatAsOf(sec) {
  if (!Number.isFinite(sec)) return null;
  try {
    return `${asOfFmt.format(new Date(sec * 1000))} ET`;
  } catch {
    return null;
  }
}

/** Live when the quote is under 20 minutes old during US market hours. */
function marketStatus(sec) {
  if (!Number.isFinite(sec)) return 'closed';
  const ageMin = (Date.now() - sec * 1000) / 60000;
  if (ageMin > 20) return 'closed';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: ET,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const mins = Number(parts.hour) * 60 + Number(parts.minute);
  const weekday = !['Sat', 'Sun'].includes(parts.weekday);
  return weekday && mins >= 570 && mins < 960 ? 'live' : 'closed';
}

function CompanyLogo({ symbol, logo }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <span className="rc-logo">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote issuer logo, sized by CSS */}
        <img
          src={logo}
          alt=""
          width={60}
          height={60}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span className="rc-logo rc-logo--text" aria-hidden="true">
      {(symbol || '').slice(0, 4)}
    </span>
  );
}

export function CompanyHero({ data, onHeatmap, onWatchlist, onSendChart }) {
  const { profile, quote } = data;
  const dir = signOf(quote.changeAbs);
  const asOf = formatAsOf(quote.asOf);
  const status = marketStatus(quote.asOf);
  const loading = quote.status === 'loading';

  const meta = [
    profile.exchange,
    profile.sector ? `Sector: ${profile.sector}` : null,
    profile.industry ? `Industry: ${profile.industry}` : null,
    quote.display.capType !== '--' ? `Cap type: ${quote.display.capType}` : null,
  ].filter(Boolean);

  const rows = [
    ['Market cap', quote.display.marketCap],
    ['P/E (TTM)', quote.display.pe],
    ['Dividend yield', quote.display.dividendYield],
    ['EPS (TTM)', quote.display.eps],
    ['Cap type', quote.display.capType],
  ];

  return (
    <section className="rc-card rc-hero" aria-labelledby="rc-hero-name">
      <div className="rc-hero__top">
        <div className="rc-hero__id">
          <CompanyLogo key={profile.ticker} symbol={profile.ticker} logo={profile.logoUrl} />
          <div className="rc-hero__names">
            <h2 id="rc-hero-name" className="rc-hero__name">
              {profile.name}
            </h2>
            <div className="rc-hero__meta">
              <span className="rc-ticker">{profile.ticker}</span>
              {meta.map((m, i) => (
                <span key={m} className="rc-hero__meta-item">
                  {i > 0 || profile.ticker ? <span className="rc-sep" aria-hidden="true" /> : null}
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="rc-hero__actions">
          <button type="button" className="rc-btn" onClick={onHeatmap}>
            <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Heatmap
          </button>
          <button type="button" className="rc-btn" onClick={onWatchlist}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add to watchlist
          </button>
          {onSendChart ? (
            <button type="button" className="rc-btn" onClick={onSendChart}>
              <i className="bi bi-send" aria-hidden="true" /> Send chart
            </button>
          ) : null}
        </div>
      </div>

      <div className="rc-hero__body">
        <div className="rc-hero__price-block">
          <div className="rc-hero__price-row">
            <span className="rc-hero__price rc-num">
              {quote.price != null ? (
                fmtMoney(quote.price)
              ) : loading ? (
                <span className="rc-skel rc-skel--price" aria-label="Loading price" />
              ) : (
                'Price unavailable'
              )}
            </span>
            {quote.changeAbs != null && quote.changePct != null ? (
              <span className={`rc-chip rc-chip--${dir} rc-num`}>
                {fmtSignedMoney(quote.changeAbs)} {fmtSignedPct(quote.changePct, 2)}
                <span className="rc-sr"> today</span>
              </span>
            ) : null}
          </div>
          {asOf ? (
            <span className="rc-hero__asof">
              <span className={`rc-dot rc-dot--${status}`} aria-hidden="true" />
              {status === 'live' ? 'Live' : 'Market closed'}
              <span aria-hidden="true">·</span> As of {asOf}
            </span>
          ) : null}
          {quote.status === 'error' ? (
            <p className="rc-inline-error" role="alert">
              Quote unavailable.{' '}
              <button type="button" className="rc-link-btn" onClick={quote.retry}>
                Retry
              </button>
            </p>
          ) : null}
          <dl className="rc-dl">
            {rows.map(([k, v]) => (
              <div key={k} className="rc-dl__row">
                <dt>{k}</dt>
                <dd className="rc-num">
                  {loading ? <span className="rc-skel rc-skel--val" aria-hidden="true" /> : v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="rc-hero__chart">
          <StockPriceChart
            symbol={profile.ticker}
            livePrice={quote.price}
            defaultRange="1Y"
            hideSymbol
            stats={null}
            endTag
          />
        </figure>
      </div>
    </section>
  );
}

export default CompanyHero;
