'use client';

import { useCompanyProfile } from '@/hooks/useFinnhub';
import './research-tab-cards.css';

function formatMarketCap(val) {
  if (val == null || val === 0) return 'n/a';
  const n = Number(val);
  const cap = n >= 1e3 && n < 1e9 ? n * 1e6 : n;
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

export function CompanyOverview({ symbol }) {
  const { data, loading, error } = useCompanyProfile(symbol);

  if (!symbol) return null;
  if (loading) {
    return (
      <section className="rco research-fade-in" aria-busy="true">
        <div className="rco-head-id">
          <span className="rco-skel rco-skel--icon" />
          <div className="rco-head-text">
            <span className="rco-skel rco-skel--title" />
            <span className="rco-skel rco-skel--line" />
          </div>
        </div>
        <span className="rco-skel rco-skel--strip" />
        <span className="rco-sr" role="status">
          Loading company profile...
        </span>
      </section>
    );
  }
  if (error || !data) {
    return (
      <section className="rco rco--state research-fade-in">
        <p className="rco-state-title">Company profile unavailable</p>
        <p className="rco-state-text">Unable to load company profile.</p>
      </section>
    );
  }

  const marketCap = formatMarketCap(data.marketCapitalization);
  const meta = [
    data.finnhubIndustry && { key: 'industry', text: data.finnhubIndustry },
    data.exchange && { key: 'exchange', text: data.exchange },
    data.country && { key: 'country', text: data.country },
  ].filter(Boolean);

  return (
    <section className="rco research-fade-up">
      <header className="rco-head">
        <div className="rco-head-id">
          {data.logo ? (
            <span className="rco-logo">
              <img src={data.logo} alt="" />
            </span>
          ) : (
            <span className="rco-icon" aria-hidden="true">
              <i className="bi bi-building" />
            </span>
          )}
          <div className="rco-head-text">
            <h3 className="rco-title">{data.name || symbol}</h3>
            {meta.length > 0 && (
              <p className="rco-desc">
                {meta.map((m, i) => (
                  <span key={m.key}>
                    {i > 0 && (
                      <span className="rco-desc-sep" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <span className={m.key === 'industry' ? 'rco-desc-industry' : undefined}>
                      {m.text}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </header>

      <dl className="rco-strip">
        <div className="rco-strip-cell">
          <dt className="rco-strip-label">Market Cap</dt>
          <dd className={`rco-strip-value${marketCap === 'n/a' ? ' is-na' : ''}`}>{marketCap}</dd>
        </div>
        {data.ipo && (
          <div className="rco-strip-cell">
            <dt className="rco-strip-label">IPO</dt>
            <dd className="rco-strip-value">{data.ipo}</dd>
          </div>
        )}
        {data.weburl && (
          <div className="rco-strip-cell">
            <dt className="rco-strip-label">Website</dt>
            <dd className="rco-strip-value">
              <a href={data.weburl} target="_blank" rel="noopener noreferrer" className="rco-link">
                {data.weburl}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
