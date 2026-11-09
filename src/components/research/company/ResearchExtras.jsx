'use client';

/**
 * Bottom row of the Company view (Nov 2026 redesign):
 *   [O] Industry research: the company's industry, a link into the Industry
 *       view, and a treemap preview of the company and its peers.
 *   [P] Portfolio tools: four tiles that open the Portfolio view tools.
 */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useStressPortfolio } from '@/hooks/useStressPortfolio';
import { runScenarioAnalysis } from '@/lib/stress-test';
import { fmtSignedPct, signOf } from '@/lib/research/company-research';

const IndustryTreemap = dynamic(() => import('./IndustryTreemap'), {
  ssr: false,
  loading: () => <div className="rc-skel rc-skel--treemap" aria-hidden="true" />,
});

export function IndustryResearchCard({ profile, peers }) {
  const [changes, setChanges] = useState({});
  const tickers = useMemo(() => peers.rows.map((r) => r.ticker), [peers.rows]);
  const key = tickers.join(',');

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    fetch(`/api/fmp/quote?symbols=${encodeURIComponent(key)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.priceMap) return;
        const out = {};
        for (const [sym, q] of Object.entries(data.priceMap)) {
          const n = Number(q?.changesPercentage);
          if (Number.isFinite(n)) out[sym] = n;
        }
        setChanges(out);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  const tiles = peers.rows
    .filter((r) => Number.isFinite(r.marketCap) && r.marketCap > 0)
    .map((r) => ({ name: r.ticker, size: r.marketCap, change: changes[r.ticker] }));

  const industry = profile.industry || profile.sector;
  const href = profile.sector
    ? `/company-research?view=industry&sector=${encodeURIComponent(profile.sector)}`
    : '/company-research?view=industry';
  const summary = tiles
    .map(
      (t) =>
        `${t.name} ${Number.isFinite(t.change) ? fmtSignedPct(t.change) : 'change unavailable'}`,
    )
    .join(', ');

  return (
    <section className="rc-card rc-o" aria-labelledby="rc-o-title">
      <div className="rc-o__text">
        <h3 id="rc-o-title" className="rc-card__title">
          Industry research
        </h3>
        {industry ? (
          <Link href={href} className="rc-o__link">
            {industry} <i className="bi bi-chevron-right" aria-hidden="true" />
          </Link>
        ) : (
          <span className="rc-muted">Industry unavailable</span>
        )}
        <p className="rc-o__desc">
          {profile.ticker} and its closest peers, sized by market cap and colored by today&apos;s
          move.
        </p>
      </div>
      {tiles.length ? (
        <Link
          href={href}
          className="rc-o__map"
          aria-label={`Open the Industry view. Today: ${summary}`}
        >
          <IndustryTreemap tiles={tiles} />
        </Link>
      ) : peers.status === 'loading' ? (
        <div className="rc-skel rc-skel--treemap" aria-hidden="true" />
      ) : null}
    </section>
  );
}

const PORTFOLIO_HREF = '/company-research?view=portfolio';

export function PortfolioToolsCard() {
  const { positions, isDemo, isLoading } = useStressPortfolio();
  const stress = useMemo(
    () => (!isDemo && positions.length ? runScenarioAnalysis(positions, '2008') : null),
    [isDemo, positions],
  );
  const noPortfolio = !isLoading && isDemo;
  const tiles = [
    {
      id: 'stress',
      name: 'Stress test',
      icon: 'bi-activity',
      value: stress ? fmtSignedPct(stress.deltaPct) : 'N/A',
      tone: stress ? signOf(stress.deltaPct) : 'flat',
      caption: stress
        ? 'Portfolio impact, 2008 crisis replay'
        : noPortfolio
          ? 'Add holdings to run this'
          : 'Loading your holdings',
    },
    /* The three below run on inputs you set in the tool, not on stored
       holdings, so there is no headline to show until you open them. */
    {
      id: 'mpt',
      name: 'Modern Portfolio Theory',
      icon: 'bi-bullseye',
      value: 'N/A',
      tone: 'flat',
      caption: noPortfolio ? 'Add holdings to run this' : 'Open to set your risk level',
    },
    {
      id: 'bl',
      name: 'Black-Litterman',
      icon: 'bi-sliders2',
      value: 'N/A',
      tone: 'flat',
      caption: noPortfolio ? 'Add holdings to run this' : 'Open to add your market views',
    },
    {
      id: 'mc',
      name: 'Monte Carlo simulation',
      icon: 'bi-shuffle',
      value: 'N/A',
      tone: 'flat',
      caption: noPortfolio ? 'Add holdings to run this' : 'Open to set your goal',
      premium: true,
    },
  ];
  return (
    <section className="rc-card rc-p" aria-labelledby="rc-p-title">
      <header className="rc-card__head">
        <h3 id="rc-p-title" className="rc-card__title">
          Portfolio tools
        </h3>
      </header>
      <div className="rc-tiles">
        {tiles.map((t) => (
          <Link key={t.id} href={PORTFOLIO_HREF} className="rc-tile">
            <span className="rc-tile__head">
              <span className="rc-tile__name">
                <i className={`bi ${t.icon}`} aria-hidden="true" />
                {t.name}
              </span>
              {t.premium ? (
                <span className="rc-badge rc-badge--premium">
                  <i className="bi bi-star-fill" aria-hidden="true" /> Premium
                </span>
              ) : null}
            </span>
            <span className={`rc-tile__value rc-num rc-tone--${t.tone}`}>{t.value}</span>
            <span className="rc-tile__caption">{t.caption}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
