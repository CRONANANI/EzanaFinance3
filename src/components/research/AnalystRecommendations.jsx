'use client';

import { useRecommendation, usePriceTarget } from '@/hooks/useFinnhub';
import './research-tab-cards.css';

export function AnalystRecommendations({ symbol }) {
  const { data: recommendations, loading: recsLoading } = useRecommendation(symbol);
  const { data: priceTarget, loading: ptLoading } = usePriceTarget(symbol);

  const isLoading = recsLoading || ptLoading;

  if (!symbol) return null;
  if (isLoading) {
    return (
      <section className="rar research-fade-in" aria-busy="true">
        <div className="rar-head-id">
          <span className="rar-skel rar-skel--icon" />
          <div className="rar-head-text">
            <span className="rar-skel rar-skel--title" />
            <span className="rar-skel rar-skel--line" />
          </div>
        </div>
        <span className="rar-skel rar-skel--block" />
        <span className="rar-sr" role="status">
          Loading analyst data...
        </span>
      </section>
    );
  }

  if ((!recommendations || recommendations.length === 0) && !priceTarget?.targetMean) {
    return (
      <section className="rar rar--state research-fade-in">
        <p className="rar-state-title">Analyst data not available</p>
        <p className="rar-state-text">No analyst ratings or price targets reported for {symbol}.</p>
      </section>
    );
  }

  const latest = recommendations?.[0];
  const total = latest
    ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    : 0;

  const recommendationData = latest
    ? [
        { label: 'Strong Buy', value: latest.strongBuy, tone: 'strong-buy' },
        { label: 'Buy', value: latest.buy, tone: 'buy' },
        { label: 'Hold', value: latest.hold, tone: 'hold' },
        { label: 'Sell', value: latest.sell, tone: 'sell' },
        { label: 'Strong Sell', value: latest.strongSell, tone: 'strong-sell' },
      ]
    : [];

  let consensus = 'Hold';
  let consensusTone = 'hold';
  let consensusIcon = 'bi-dash-lg';

  if (latest) {
    const buyTotal = latest.strongBuy + latest.buy;
    const sellTotal = latest.sell + latest.strongSell;
    if (buyTotal > sellTotal + latest.hold) {
      consensus = 'Buy';
      consensusTone = 'buy';
      consensusIcon = 'bi-graph-up-arrow';
    } else if (sellTotal > buyTotal + latest.hold) {
      consensus = 'Sell';
      consensusTone = 'sell';
      consensusIcon = 'bi-graph-down-arrow';
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'n/a';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const targets = priceTarget?.targetMean
    ? [
        { label: 'Low', value: formatPrice(priceTarget.targetLow) },
        { label: 'Mean', value: formatPrice(priceTarget.targetMean), em: true },
        { label: 'High', value: formatPrice(priceTarget.targetHigh) },
      ]
    : [];

  return (
    <section className="rar research-fade-up">
      <header className="rar-head">
        <div className="rar-head-id">
          <span className="rar-icon" aria-hidden="true">
            <i className="bi bi-people" />
          </span>
          <div className="rar-head-text">
            <h3 className="rar-title">Analyst Ratings</h3>
            <p className="rar-desc">Street consensus and price targets for {symbol}</p>
          </div>
        </div>
        {latest && (
          <div className={`rar-consensus is-${consensusTone}`}>
            <i className={`bi ${consensusIcon}`} aria-hidden="true" />
            <span className="rar-consensus-text">
              <span className="rar-consensus-label">{consensus}</span>
              <span className="rar-consensus-count">
                {total} Analyst{total !== 1 ? 's' : ''}
              </span>
            </span>
          </div>
        )}
      </header>

      {latest && (
        <ul className="rar-dist" aria-label="Rating distribution">
          {recommendationData.map((rec) => (
            <li key={rec.label} className="rar-dist-row">
              <span className="rar-dist-label">{rec.label}</span>
              <span className="rar-bar" aria-hidden="true">
                <span
                  className={`rar-bar-fill is-${rec.tone}`}
                  style={{ width: `${total > 0 ? (rec.value / total) * 100 : 0}%` }}
                />
              </span>
              <span className="rar-dist-value">{rec.value}</span>
            </li>
          ))}
        </ul>
      )}

      {priceTarget?.targetMean && (
        <div className="rar-targets">
          <h4 className="rar-eyebrow">Price Target ({priceTarget.numberAnalysts ?? 0} Analysts)</h4>
          <dl className="rar-strip">
            {targets.map((t) => (
              <div key={t.label} className="rar-strip-cell">
                <dt className="rar-strip-label">{t.label}</dt>
                <dd
                  className={`rar-strip-value${t.value === 'n/a' ? ' is-na' : t.em ? ' is-em' : ''}`}
                >
                  {t.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {latest && <p className="rar-foot">Last updated: {latest.period}</p>}
    </section>
  );
}
